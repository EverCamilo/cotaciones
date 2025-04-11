/**
 * Configura o tratamento global de erros não capturados no frontend
 */
export function setupGlobalErrorHandlers() {
  // Capturar erros de promessas não tratados
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Rejeição não tratada detectada:', event.reason);
    
    // Prevenir que o erro apareça no console como não tratado
    event.preventDefault();
    
    // Você pode enviar o erro para um serviço de monitoramento aqui, se necessário
  });
  
  // Capturar erros globais não tratados
  window.addEventListener('error', (event) => {
    console.warn('Erro global não tratado:', event.error);
    
    // Você pode enviar o erro para um serviço de monitoramento aqui, se necessário
    
    // Se o erro estiver relacionado a carregamento de recursos (como imagens),
    // podemos prevenir que o erro apareça no console
    if (event.target && ('src' in event.target || 'href' in event.target)) {
      event.preventDefault();
    }
  });
}

/**
 * Retorna uma promessa que nunca rejeitará, apenas resolverá com um valor ou null em caso de erro
 * Útil para evitar que promessas não tratadas façam o app quebrar
 */
export async function safePromise<T>(promiseOrFn: Promise<T> | (() => Promise<T>)): Promise<T | null> {
  try {
    if (typeof promiseOrFn === 'function') {
      return await promiseOrFn();
    } else {
      return await promiseOrFn;
    }
  } catch (error) {
    console.warn('Erro capturado em safePromise:', error);
    return null;
  }
}

/**
 * Retorna uma função que executa a operação fornecida com proteção contra erros
 * Útil para callbacks de eventos onde não queremos que erros interrompam a execução
 */
export function safeOperation<Args extends any[], ReturnType>(
  operation: (...args: Args) => ReturnType
): (...args: Args) => ReturnType | null {
  return (...args: Args) => {
    try {
      return operation(...args);
    } catch (error) {
      console.warn('Erro capturado em safeOperation:', error);
      return null;
    }
  };
}