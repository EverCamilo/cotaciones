import React, { useEffect, useState } from 'react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRealtimeSyncContext } from '@/contexts/RealtimeSyncContext';

export function OfflineBanner() {
  const { isConnected, connectionError, connect } = useRealtimeSyncContext();
  const [dismissed, setDismissed] = useState(false);
  
  // Resetar o estado de dismissed quando a conexão for restabelecida
  useEffect(() => {
    if (isConnected) {
      setDismissed(false);
    }
  }, [isConnected]);
  
  // Não mostrar nada se estiver conectado ou se o banner foi dispensado
  if (isConnected || dismissed || !connectionError) {
    return null;
  }
  
  return (
    <Alert 
      className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 z-50 shadow-lg border-orange-500 bg-orange-50 text-orange-800 animate-in fade-in slide-in-from-bottom-5 duration-300 py-2"
    >
      <AlertTriangle className="h-5 w-5 text-orange-500" />
      <div className="flex-1">
        <AlertTitle>Modo Offline Ativado</AlertTitle>
        <AlertDescription className="text-sm">
          O sistema está funcionando com dados armazenados localmente. Algumas funcionalidades podem estar limitadas.
        </AlertDescription>
      </div>
      <div className="ml-2 flex flex-col gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-1 text-xs"
          onClick={() => connect()}
        >
          <Wifi className="h-3 w-3" />
          Reconectar
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="flex items-center gap-1 text-xs"
          onClick={() => setDismissed(true)}
        >
          <WifiOff className="h-3 w-3" />
          Continuar offline
        </Button>
      </div>
    </Alert>
  );
}