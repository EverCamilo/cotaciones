/**
 * Gerenciador de sincronização e cache de dados
 * 
 * IMPORTANTE: ESTRATÉGIA DE DADOS ATUAL
 * -------------------------------
 * Nossa abordagem atual usa CARREGAMENTO ÚNICO via initialLoad.ts
 * Não estamos mais usando a sincronização em tempo real com listeners do Firebase
 * 
 * O método initializeRealTimeSync está DEPRECIADO e não deve ser usado.
 * Usamos apenas as estruturas de dados deste módulo (dataCache e lastUpdateTime)
 * para manter compatibilidade com o código existente.
 * 
 * As atualizações de dados agora ocorrem diretamente via API REST.
 */

import { realtimeSync } from './realtimeSync';
import WebSocket from 'ws';

// Cache global de dados para as diferentes coleções
// Mantendo essa estrutura para compatibilidade com código existente
// Exportado para uso externo por initialLoad.ts
export const dataCache = {
  freightQuotes: [] as any[],
  clients: [] as any[],
  exchangeRates: [] as any[]
};

// Rastreador de última atualização para cada coleção
// Exportado para uso externo
export const lastUpdateTime = {
  freightQuotes: 0,
  clients: 0,
  exchangeRates: 0
};

// Armazenar clientes WebSocket para notificações
const wsClients = new Set<WebSocket>();

// Controle de tempo de vida do cache em ms (1 hora) - aumentado para evitar problemas com expiração
const CACHE_TTL = 60 * 60 * 1000; 

// Limite máximo de documentos a serem sincronizados por coleção
// Isso reduz a quantidade de dados trafegados e o uso de memória
const MAX_DOCUMENTS = 50;

/**
 * Adiciona um cliente WebSocket para receber notificações em tempo real
 * @param ws - Cliente WebSocket a ser adicionado
 */
export function addWebSocketClient(ws: WebSocket): void {
  wsClients.add(ws);
  console.log(`Cliente WebSocket adicionado. Total de clientes: ${wsClients.size}`);
  
  // Enviar dados iniciais para o cliente
  sendInitialData(ws);
  
  // Configurar limpeza quando o cliente se desconectar
  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`Cliente WebSocket removido. Total de clientes: ${wsClients.size}`);
  });
}

/**
 * Envia dados iniciais para um cliente WebSocket com tratamento de erro robusto
 * @param ws - Cliente WebSocket que receberá os dados
 */
function sendInitialData(ws: WebSocket): void {
  // Verificar se o WebSocket está realmente aberto para evitar erros
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn('Tentativa de enviar dados iniciais para WebSocket que não está aberto. Estado:', 
      ws.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
      ws.readyState === WebSocket.CLOSING ? 'CLOSING' :
      ws.readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN');
    return;
  }
  
  try {
    // Função auxiliar para enviar com tratamento de erro por coleção
    const sendCollection = (collection: string, data: any[]) => {
      if (data.length > 0) {
        try {
          const message = JSON.stringify({
            type: 'initial',
            collection,
            data,
            timestamp: Date.now()
          });
          
          ws.send(message);
          console.log(`Enviados ${data.length} documentos iniciais de ${collection} para WebSocket`);
        } catch (collectionError) {
          console.error(`Erro ao enviar coleção ${collection} para cliente WebSocket:`, collectionError);
        }
      }
    };
    
    // Enviar cada coleção separadamente para isolar possíveis erros
    sendCollection('freightQuotes', dataCache.freightQuotes);
    
    // Pequeno delay para não sobrecarregar o cliente
    setTimeout(() => sendCollection('clients', dataCache.clients), 100);
    
    // Pequeno delay para não sobrecarregar o cliente
    setTimeout(() => sendCollection('exchangeRates', dataCache.exchangeRates), 200);
    
  } catch (error) {
    console.error('Erro ao enviar dados iniciais para cliente WebSocket:', error);
  }
}

/**
 * Notifica todos os clientes WebSocket sobre uma atualização
 * @param collection - Nome da coleção que foi atualizada
 * @param data - Dados atualizados
 * @param updateType - Tipo de atualização (added, modified, removed)
 */
function notifyClients(collection: string, data: any, updateType: 'added' | 'modified' | 'removed'): void {
  // Preparar mensagem uma única vez para todas as conexões
  const message = JSON.stringify({
    type: 'update',
    collection,
    updateType,
    data,
    timestamp: Date.now()  // Adicionar timestamp para ajudar no rastreamento
  });
  
  let clientsNotified = 0;
  let clientsSkipped = 0;
  let clientsWithError = 0;
  
  wsClients.forEach(client => {
    // Verificação robusta do estado com constantes do WebSocket
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        clientsNotified++;
      } catch (error) {
        console.error('Erro ao enviar mensagem para cliente WebSocket:', error);
        clientsWithError++;
        
        // Tentar fechar conexões com erro para evitar problemas futuros
        try {
          client.terminate();
        } catch (terminateError) {
          console.error('Erro ao terminar conexão com erro:', terminateError);
        }
      }
    } else {
      clientsSkipped++;
      
      // Fechar conexões em estados inválidos para liberar recursos
      if (client.readyState === WebSocket.CLOSING || client.readyState === WebSocket.CLOSED) {
        try {
          // Remover da lista de clientes se já estiver fechado
          wsClients.delete(client);
        } catch (error) {
          console.error('Erro ao remover cliente fechado da lista:', error);
        }
      }
    }
  });
  
  // Log mais informativo e detalhado para diagnóstico
  if (clientsNotified > 0 || clientsWithError > 0) {
    console.log(
      `Atualização em ${collection}: ${clientsNotified} clientes notificados, ` +
      `${clientsSkipped} ignorados (não conectados), ${clientsWithError} com erro`
    );
  }
}

/**
 * Inicia a sincronização em tempo real para todas as coleções relevantes
 * 
 * @deprecated Esta função está DEPRECIADA e não deve ser usada.
 * A abordagem atual da aplicação usa carregamento único via initialLoad.ts.
 * O uso desta função causará listeners duplicados e problemas de conexão.
 * 
 * @returns Função para encerrar as sincronizações
 */
export function initializeRealTimeSync(): () => void {
  console.warn('ATENÇÃO: Função initializeRealTimeSync() está DEPRECIADA! Use loadInitialData() de initialLoad.ts em vez disso');
  console.warn('Iniciando sincronização em tempo real com Firebase (modo incompatível com a estratégia atual)...');
  
  // Sincronizar cotações de frete com limite de documentos
  const unsubscribeFreightQuotes = realtimeSync.syncFreightQuotes({
    maxDocuments: MAX_DOCUMENTS,
    onInitialData: (data) => {
      dataCache.freightQuotes = data;
      lastUpdateTime.freightQuotes = Date.now();
      console.log(`Cache de cotações de frete inicializado com ${data.length} itens`);
    },
    onUpdate: (item, updateType) => {
      // Atualizar timestamp de última atualização
      lastUpdateTime.freightQuotes = Date.now();
      
      if (updateType === 'added') {
        // Adicionar no início para manter os mais recentes
        dataCache.freightQuotes.unshift(item);
        // Limitar o tamanho do cache
        if (dataCache.freightQuotes.length > MAX_DOCUMENTS) {
          dataCache.freightQuotes = dataCache.freightQuotes.slice(0, MAX_DOCUMENTS);
        }
      } else if (updateType === 'modified') {
        const index = dataCache.freightQuotes.findIndex(q => q.id === item.id);
        if (index >= 0) {
          dataCache.freightQuotes[index] = item;
        }
      } else if (updateType === 'removed') {
        dataCache.freightQuotes = dataCache.freightQuotes.filter(q => q.id !== item.id);
      }
      
      // Notificar clientes WebSocket sobre a atualização
      notifyClients('freightQuotes', item, updateType);
    },
    onError: (error) => {
      console.error('Erro na sincronização de cotações de frete:', error);
    }
  });
  
  // Sincronizar clientes com limite de documentos
  const unsubscribeClients = realtimeSync.syncClients({
    maxDocuments: MAX_DOCUMENTS,
    onInitialData: (data) => {
      dataCache.clients = data;
      lastUpdateTime.clients = Date.now();
      console.log(`Cache de clientes inicializado com ${data.length} itens`);
    },
    onUpdate: (item, updateType) => {
      // Atualizar timestamp de última atualização
      lastUpdateTime.clients = Date.now();
      
      if (updateType === 'added') {
        dataCache.clients.unshift(item);
        // Limitar o tamanho do cache
        if (dataCache.clients.length > MAX_DOCUMENTS) {
          dataCache.clients = dataCache.clients.slice(0, MAX_DOCUMENTS);
        }
      } else if (updateType === 'modified') {
        const index = dataCache.clients.findIndex(c => c.id === item.id);
        if (index >= 0) {
          dataCache.clients[index] = item;
        }
      } else if (updateType === 'removed') {
        dataCache.clients = dataCache.clients.filter(c => c.id !== item.id);
      }
      
      // Notificar clientes WebSocket sobre a atualização
      notifyClients('clients', item, updateType);
    },
    onError: (error) => {
      console.error('Erro na sincronização de clientes:', error);
    }
  });
  
  // Sincronizar taxas de câmbio com limite de documentos menor (normalmente há poucos registros)
  const unsubscribeExchangeRates = realtimeSync.syncExchangeRates({
    maxDocuments: 10, // Normalmente há apenas um registro de taxa de câmbio atual
    onInitialData: (data) => {
      dataCache.exchangeRates = data;
      lastUpdateTime.exchangeRates = Date.now();
      console.log(`Cache de taxas de câmbio inicializado com ${data.length} itens`);
    },
    onUpdate: (item, updateType) => {
      // Atualizar timestamp de última atualização
      lastUpdateTime.exchangeRates = Date.now();
      
      if (updateType === 'added') {
        dataCache.exchangeRates.unshift(item);
        // Limitar o tamanho do cache
        if (dataCache.exchangeRates.length > 10) {
          dataCache.exchangeRates = dataCache.exchangeRates.slice(0, 10);
        }
      } else if (updateType === 'modified') {
        const index = dataCache.exchangeRates.findIndex(r => r.id === item.id);
        if (index >= 0) {
          dataCache.exchangeRates[index] = item;
        }
      } else if (updateType === 'removed') {
        dataCache.exchangeRates = dataCache.exchangeRates.filter(r => r.id !== item.id);
      }
      
      // Notificar clientes WebSocket sobre a atualização
      notifyClients('exchangeRates', item, updateType);
    },
    onError: (error) => {
      console.error('Erro na sincronização de taxas de câmbio:', error);
    }
  });
  
  // Retornar função para parar todas as sincronizações
  return () => {
    unsubscribeFreightQuotes();
    unsubscribeClients();
    unsubscribeExchangeRates();
    console.log('Sincronização em tempo real encerrada.');
  };
}

/**
 * Verifica se o cache de uma coleção ainda é válido
 * @param collection - Nome da coleção
 * @returns true se o cache ainda for válido, false caso contrário
 */
function isCacheValid(collection: keyof typeof lastUpdateTime): boolean {
  const lastUpdate = lastUpdateTime[collection];
  const now = Date.now();
  
  // Se não temos um timestamp de atualização, o cache não é válido
  if (lastUpdate <= 0) {
    return false;
  }
  
  // Se tivermos dados no cache, considerar válido mesmo se expirado
  // Apenas logar um aviso se estiver expirado mas ainda tiver dados
  if ((now - lastUpdate) >= CACHE_TTL) {
    if (dataCache[collection] && dataCache[collection].length > 0) {
      // Se temos dados, considerar válido mesmo expirado
      console.log(`Cache de ${collection} expirado mas com dados disponíveis (${dataCache[collection].length} itens)`);
      return true;
    } else {
      return false;
    }
  }
  
  // Cache dentro do período de validade
  return true;
}

// Registrar quais avisos já foram mostrados para evitar spam no log
const warningShown: Record<string, number> = {
  freightQuotes: 0,
  clients: 0,
  exchangeRates: 0
};

// Período para repetir avisos (em ms) - 1 minuto
const WARNING_REPEAT_INTERVAL = 60 * 1000;

/**
 * Retorna os dados em cache para uma determinada coleção
 * @param collection - Nome da coleção ('freightQuotes', 'clients', 'exchangeRates')
 * @returns Os dados em cache para a coleção especificada ou um array vazio
 */
export function getCachedData(collection: 'freightQuotes' | 'clients' | 'exchangeRates'): any[] {
  // Verificar se o cache é válido
  if (!isCacheValid(collection)) {
    const now = Date.now();
    
    // Mostrar mensagem apenas se não foi mostrada recentemente para evitar spam
    if (now - warningShown[collection] > WARNING_REPEAT_INTERVAL) {
      console.log(`Cache de ${collection} expirado ou não inicializado, aguarde atualização`);
      warningShown[collection] = now;
    }
  }
  
  // Se temos dados mesmo que expirados, usamos eles
  if (dataCache[collection] && dataCache[collection].length > 0) {
    console.log(`Usando dados em cache para ${collection}`);
    return dataCache[collection];
  }
  
  // Caso não tenha dados, retornar array vazio
  return [];
}

/**
 * Devolve o cache completo de dados, incluindo metadados de validade
 * @returns O objeto de cache completo com metadados
 */
export function getAllCachedData(): typeof dataCache & { _meta: typeof lastUpdateTime } {
  return {
    ...dataCache,
    _meta: { ...lastUpdateTime }
  };
}