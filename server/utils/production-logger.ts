/**
 * Utilitário de logger que suprime mensagens de log em produção,
 * mantendo apenas logs críticos.
 * 
 * Este módulo substitui 'console.log', 'console.info' etc. por funções vazias
 * em ambiente de produção, mas mantém 'console.error' para erros críticos.
 */

// Determine se estamos em produção
const isProduction = process.env.NODE_ENV === 'production';

// Exporta versões silenciosas dos métodos de console para produção
export const logger = {
  log: isProduction ? () => {} : console.log,
  info: isProduction ? () => {} : console.info,
  debug: isProduction ? () => {} : console.debug,
  warn: isProduction ? () => {} : console.warn,
  // Mantém console.error mesmo em produção para erros críticos
  error: console.error
};

// Exporta uma função para substituir todos os métodos de console em um módulo
export function silenceConsole() {
  if (isProduction) {
    // Em produção, silencia todos os logs exceto erros
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.warn = () => {};
    // console.error é mantido para erros críticos
  }
}

export default logger;