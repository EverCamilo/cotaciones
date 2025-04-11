import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRealtimeSyncContext } from '@/contexts/RealtimeSyncContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface OfflineBannerProps {
  className?: string;
}

/**
 * Banner de status offline melhorado com verificações avançadas
 * para reduzir falsos positivos e melhorar a experiência do usuário
 */
const OfflineBanner: React.FC<OfflineBannerProps> = ({ className }) => {
  const { 
    isConnected, 
    isConnecting, 
    connectionError, 
    connect,
    disconnect,
    freightQuotes,
    clients,
    exchangeRates
  } = useRealtimeSyncContext();
  
  // Estado para atrasar a exibição do banner, evitando flash durante carregamentos iniciais
  const [showDelayed, setShowDelayed] = useState(false);
  
  // Verificação avançada de dados carregados para evitar falsos positivos de offline
  const hasFreightQuotes = freightQuotes?.length > 0;
  const hasClients = clients?.length > 0;
  const hasExchangeRates = exchangeRates?.length > 0;
  
  // Verificações robustas para determinar se temos dados funcionais
  const hasLoadedData = hasFreightQuotes || hasClients || hasExchangeRates;
  const hasMultipleDataSets = [hasFreightQuotes, hasClients, hasExchangeRates].filter(Boolean).length >= 2;
  
  // Verificar a idade dos dados carregados
  const dataFreshness = React.useMemo(() => {
    if (!freightQuotes?.length) return null;
    // Considerar dados como "recentes" se foram carregados/atualizados nos últimos minutos
    const now = Date.now();
    const newestFreightQuoteTime = Math.max(
      ...freightQuotes.map(q => q.updatedAt ? new Date(q.updatedAt).getTime() : 0)
    );
    return now - newestFreightQuoteTime < 10 * 60 * 1000; // 10 minutos
  }, [freightQuotes]);
  
  // Atrasamos a exibição do banner para evitar flash durante carregamentos iniciais
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Estratégia aprimorada para ambientes como Replit:
    // - Atraso maior para mostrar o banner (5 segundos) para evitar falsos alertas
    // - Em ambientes com falhas frequentes de WebSocket, este delay maior é crucial
    if (!isConnected && !isConnecting && connectionError) {
      // Verificar se é um erro transitório (código 1006)
      const is1006Error = connectionError.message.includes('1006');
      
      // Delay maior para erros 1006 que geralmente se auto-resolvem
      const delayTime = is1006Error ? 7000 : 5000;
      
      timer = setTimeout(() => {
        // Verificação dupla: só mostrar se ainda houver erro de conexão
        if (!isConnected && connectionError) {
          setShowDelayed(true);
        }
      }, delayTime);
    } else {
      setShowDelayed(false);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [isConnected, isConnecting, connectionError]);
  
  // Verificação de erro transitório vs. persistente
  const isTransientError = React.useMemo(() => {
    if (!connectionError) return false;
    // Erros considerados transitórios (temporários):
    // - Código 1006 é extremamente comum em ambientes como Replit
    // - Mensagens de timeout ou "tentando reconectar"
    // - Qualquer erro contendo "WebSocket" é provavelmente temporário
    return connectionError.message.includes('1006') || 
           connectionError.message.includes('timeout') ||
           connectionError.message.includes('reconectar') ||
           connectionError.message.includes('WebSocket') ||
           connectionError.message.includes('dificuldade') ||
           connectionError.message.includes('Dificuldade'); 
  }, [connectionError]);
  
  // Verificar preferência salva para modo offline
  const preferOfflineMode = localStorage.getItem('preferOfflineMode') === 'true';
  
  // Ocultar banner em diversos cenários para evitar falsos positivos:
  // 1. Conectado sem erro ou tentando conectar
  // 2. Dados carregados + erro transitório (falha temporária mas temos dados)
  // 3. Múltiplos conjuntos de dados carregados recentemente (sistema funcional mesmo offline)
  // 4. Usuário optou explicitamente por trabalhar offline
  // 5. Banner ainda não passou pelo delay de exibição para evitar flashes
  // 6. NUNCA mostrar banner para erros de código 1006, independente de ter dados ou não
  
  // Verificar se o erro é relacionado ao código 1006 (SEMPRE ignorar, pois é muito comum no Replit)
  const is1006Error = connectionError?.message?.includes('1006');
  
  // NOVA IMPLEMENTAÇÃO: Se o erro for 1006, NUNCA mostrar o banner, independente de outras condições
  if (is1006Error) {
    return null;
  }
  
  if (
    // Conectado normalmente ou tentando conectar
    (isConnected && !connectionError) || 
    isConnecting || 
    
    // Dados disponíveis com erros temporários (alta tolerância)
    (hasLoadedData && isTransientError) ||
    
    // Sistema parece funcional mesmo em modo offline
    (hasMultipleDataSets && dataFreshness) ||
    
    // Preferências do usuário ou banner ainda em delay
    preferOfflineMode ||
    !showDelayed
  ) {
    return null;
  }
  
  // Função para tentar reconectar
  const handleReconnect = () => {
    connect();
  };
  
  // Função para continuar em modo offline
  const handleContinueOffline = () => {
    // Desconectar o websocket para evitar tentativas automáticas de reconexão
    disconnect();
    
    // Armazenar a preferência do usuário por modo offline (opcional)
    localStorage.setItem('preferOfflineMode', 'true');
  };
  
  // Estado de conexão específico
  const isReconnecting = isConnecting;
  const hasError = !!connectionError;
  
  return (
    <Alert 
      variant="destructive" 
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-md z-50 bg-card border shadow-lg",
        "animate-fade-in-up",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
        <div className="flex-1">
          <AlertTitle className="mb-2 text-warning">
            Modo Offline Ativado
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            O sistema está funcionando com dados
            armazenados localmente. Algumas
            funcionalidades podem estar limitadas.
          </AlertDescription>
          
          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1.5" 
              onClick={handleReconnect}
              disabled={isReconnecting}
            >
              {isReconnecting ? (
                <ArrowRightLeft className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )}
              <span>{isReconnecting ? 'Reconectando...' : 'Reconectar'}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 gap-1.5 hover:bg-white/5" 
              onClick={handleContinueOffline}
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>Continuar offline</span>
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
};

export default OfflineBanner;