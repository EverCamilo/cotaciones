import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toastInfo, toastWarning } from '@/hooks/use-toast';
import { apiFetch } from '../utils/apiConfig';

// Definindo os tipos de dados que serão sincronizados
interface FreightQuote {
  id: string;
  [key: string]: any;
}

interface Client {
  id: string;
  [key: string]: any;
}

interface ExchangeRate {
  id: string;
  [key: string]: any;
}

// Estado do contexto
interface RealtimeSyncState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: Error | null;
  freightQuotes: FreightQuote[];
  clients: Client[];
  exchangeRates: ExchangeRate[];
  connect: () => void;
  disconnect: () => void;
}

// Valor padrão para o contexto
const defaultContextValue: RealtimeSyncState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  freightQuotes: [],
  clients: [],
  exchangeRates: [],
  connect: () => {},
  disconnect: () => {}
};

// Criar o contexto
const RealtimeSyncContext = createContext<RealtimeSyncState>(defaultContextValue);

// Hook para usar o contexto
export const useRealtimeSyncContext = () => useContext(RealtimeSyncContext);

// Provider do contexto - VERSÃO ULTRA SIMPLIFICADA
// Implementação dummy que não usa WebSockets nem chamadas de API
export const RealtimeSyncProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {  
  // Retornar o provider com valores padrão (dummy)
  return (
    <RealtimeSyncContext.Provider value={defaultContextValue}>
      {children}
    </RealtimeSyncContext.Provider>
  );
};