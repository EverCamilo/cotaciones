/**
 * Utilitários para produção que ajudam a preparar a aplicação para ambiente de produção
 */

/**
 * Configura NODE_ENV para 'production' em ambientes de produção
 * e remove logs desnecessários
 */
export function setupProductionEnvironment() {
  if (import.meta.env.MODE === 'production') {
    // Em produção, silencia logs não essenciais
    const noop = () => {};
    
    // Preservamos o console.error original para mensagens críticas
    const originalError = console.error;
    
    // Sobrescreve os métodos de console com funções vazias
    Object.assign(console, {
      log: noop,
      info: noop,
      debug: noop,
      warn: noop,
      // Exceção para console.error, mantemos para erros críticos
      error: (...args: any[]) => {
        // Opcionalmente, adicionar filtragem para mensagens de erro
        // Remova esta condição se quiser todos os erros
        if (args[0] && typeof args[0] === 'string' && 
            (args[0].includes('[Critical]') || args[0].includes('Erro fatal'))) {
          originalError.apply(console, args);
        }
      }
    });
  }
}

export default { setupProductionEnvironment };