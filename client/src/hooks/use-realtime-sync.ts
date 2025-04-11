import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toastSuccess } from '@/hooks/use-toast';

interface RealtimeSyncOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onInitialData?: (collection: string, data: any[]) => void;
  onUpdate?: (collection: string, data: any, updateType: string) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Hook para gerenciar a conexão WebSocket com o servidor para sincronização em tempo real.
 * 
 * @param options Opções de configuração
 * @returns Objeto com estado da conexão e métodos para gerenciá-la
 */
export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  
  const {
    onConnect,
    onDisconnect,
    onError,
    onInitialData,
    onUpdate,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;
  
  // Detectar se o navegador suporta WebSockets
  const browserSupportsWebSockets = useCallback(() => {
    return typeof WebSocket !== 'undefined';
  }, []);

  // Verificar se estamos em ambiente seguro (necessário em alguns navegadores)
  const isSecureContext = useCallback(() => {
    return window.isSecureContext;
  }, []);

  // Verificar possíveis razões para falha no WebSocket
  const checkWebSocketViability = useCallback(() => {
    if (!browserSupportsWebSockets()) {
      setConnectionError(new Error('Seu navegador não suporta WebSockets. Funcionando em modo offline.'));
      return false;
    }

    if (!isSecureContext() && window.location.protocol !== 'http:') {
      console.warn('WebSockets podem não funcionar corretamente em contextos não seguros.');
    }

    const replit = window.location.hostname.includes('replit.dev') || 
                  window.location.hostname.includes('repl.co');
                  
    if (replit) {
      console.log('Executando no ambiente Replit, isso pode afetar a conexão WebSocket.');
    }

    return true;
  }, [browserSupportsWebSockets, isSecureContext]);
  
  /**
   * Processar mensagens recebidas do WebSocket
   */
  const handleMessage = useCallback((message: any) => {
    // Mensagem de conexão estabelecida
    if (message.type === 'connected') {
      console.log('Connected to real-time sync service');
      toastSuccess({
        title: 'Sincronização Ativa',
        description: 'Sincronização em tempo real estabelecida com sucesso.'
      });
    }
    // Dados iniciais recebidos
    else if (message.type === 'initial' && message.collection && Array.isArray(message.data)) {
      console.log(`Received initial data for ${message.collection}: ${message.data.length} items`);
      if (onInitialData) {
        onInitialData(message.collection, message.data);
      }
    }
    // Atualização de dados
    else if (message.type === 'update' && message.collection && message.data && message.updateType) {
      console.log(`Received update for ${message.collection}: ${message.updateType}`);
      if (onUpdate) {
        onUpdate(message.collection, message.data, message.updateType);
      }
    }
  }, [onInitialData, onUpdate]);
  
  /**
   * Enviar um ping para manter a conexão ativa
   */
  const sendPing = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);
  
  /**
   * Função para conectar ao WebSocket
   */
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Criar um timeout para a tentativa de conexão
      const connectionTimeoutId = setTimeout(() => {
        console.warn('WebSocket connection timeout after 10 seconds');
        if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
          socketRef.current.close();
          setIsConnecting(false);
          setConnectionError(new Error('Timeout ao tentar conectar. Operando em modo offline.'));
        }
      }, 10000); // 10 segundos para timeout
      
      // Construir a URL do WebSocket baseada na URL atual
      const baseUrl = window.location.origin.replace(/^http/, 'ws');
      const wsUrl = `${baseUrl}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Função para limpar o timeout quando a conexão for estabelecida ou falhar
      const clearConnectionTimeout = () => {
        clearTimeout(connectionTimeoutId);
      };
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
        clearConnectionTimeout();
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        
        // Executar callback se fornecido
        if (onConnect) onConnect();
        
        // Enviar ping inicial para confirmar que a conexão está realmente funcionando
        try {
          socket.send(JSON.stringify({ type: 'ping' }));
        } catch (err) {
          console.warn('Erro ao enviar ping inicial:', err);
        }
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        clearConnectionTimeout();
        setIsConnected(false);
        setIsConnecting(false);
        
        // Tratamento especial para o código 1006 (fechamento anormal)
        if (event.code === 1006) {
          console.warn('Conexão WebSocket fechada anormalmente (código 1006)');
          setConnectionError(new Error('A conexão foi fechada inesperadamente (código 1006)'));
        }
        
        // Executar callback se fornecido
        if (onDisconnect) onDisconnect();
        
        // Tentar reconectar automaticamente, se configurado
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }
          
          // Backoff exponencial com fator reduzido para erro 1006
          // Isso faz com que tentemos reconectar mais rapidamente em caso de erro 1006
          const exponentialFactor = event.code === 1006 ? 1.5 : 2;
          
          // Exponential backoff para tentar reconectar
          const backoffTime = Math.min(
            reconnectInterval * Math.pow(exponentialFactor, reconnectAttemptsRef.current - 1),
            30000 // Máximo de 30 segundos
          );
          
          reconnectTimerRef.current = setTimeout(() => {
            // Verificar novamente a viabilidade antes de reconectar
            const isViable = checkWebSocketViability();
            if (isViable) {
              setIsConnecting(false);
              connect();
            } else {
              setConnectionError(new Error('WebSocket não está disponível neste ambiente'));
            }
          }, backoffTime);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached.`);
          setConnectionError(new Error(`Não foi possível reconectar após ${maxReconnectAttempts} tentativas.`));
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        clearConnectionTimeout();
        const error = new Error('WebSocket connection error');
        setConnectionError(error);
        setIsConnecting(false);
        
        // Executar callback se fornecido
        if (onError) onError(error);
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      setIsConnecting(false);
      setConnectionError(error instanceof Error ? error : new Error(String(error)));
      
      // Executar callback se fornecido
      if (onError && error instanceof Error) onError(error);
    }
  }, [
    isConnecting, onConnect, onDisconnect, onError, 
    autoReconnect, reconnectInterval, maxReconnectAttempts,
    checkWebSocketViability, handleMessage
  ]);
  
  /**
   * Função para desconectar do WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);
  
  // Conectar automaticamente ao montar o componente, com suporte a modo offline
  useEffect(() => {
    // Verificar viabilidade do WebSocket
    const isViable = checkWebSocketViability();
    
    // Tentativa inicial de conexão apenas se viável
    if (isViable) {
      connect();
    }
    
    // Detectar quando o navegador fica online/offline
    const handleOnline = () => {
      console.log('Browser went online, attempting to reconnect...');
      reconnectAttemptsRef.current = 0;
      const isViable = checkWebSocketViability();
      if (isViable) {
        connect();
      }
    };
    
    const handleOffline = () => {
      console.log('Browser went offline, disconnecting...');
      setIsConnected(false);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Limpar ao desmontar
    return () => {
      disconnect();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect, disconnect, checkWebSocketViability]);
  
  // Configurar ping periódico para manter a conexão viva
  useEffect(() => {
    if (!isConnected) return;
    
    const pingInterval = setInterval(() => {
      sendPing();
    }, 30000); // Ping a cada 30 segundos
    
    return () => {
      clearInterval(pingInterval);
    };
  }, [isConnected, sendPing]);
  
  return {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    sendPing
  };
}