/**
 * Configuração central da API
 * 
 * Este arquivo contém a configuração base para conexões com a API.
 * Centraliza a definição do protocolo (HTTP/HTTPS) e base URL para evitar
 * problemas de conectividade em diferentes ambientes.
 */

// IMPORTANTE: Usar SEMPRE HTTP em ambientes dev/preview
// pois o Replit não suporta HTTPS diretamente para comunicação interna

// Base URL para todos os endpoints da API
export const API_BASE_URL = '/api';

// Método utilitário para montar a URL correta para cada endpoint
export const buildApiUrl = (endpoint: string): string => {
  // Verificação crítica: se o endpoint já é uma URL completa, retorna imediatamente
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    console.warn('Recebida URL absoluta, retornando sem modificações:', endpoint);
    return endpoint;
  }
  
  // Remover qualquer /api inicial para evitar duplicações
  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.substring(5); // Remove "/api/"
  } else if (cleanEndpoint.startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.substring(4); // Remove "api/"
  }
  
  // Garantir que o endpoint limpo tenha uma barra no início
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }
  
  // Adicionar timestamp para evitar cache do navegador
  const timestamp = new Date().getTime();
  const separator = cleanEndpoint.includes('?') ? '&' : '?';
  
  // Montar a URL final sempre com formato consistente /api/endpoint?_t=timestamp
  return `${API_BASE_URL}${cleanEndpoint}${separator}_t=${timestamp}`;
};

// Função wrapper para fetch que usa a configuração correta
export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  
  try {
    return await fetch(url, {
      ...options,
      // Sempre incluir credenciais para cookies de sessão
      credentials: 'include',
      // Adicionar header de JSON para POSTs automaticamente
      headers: {
        // Não usar cache para nenhuma requisição
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...(options?.headers || {}),
        ...((options?.method === 'POST' || options?.method === 'PUT' || options?.method === 'PATCH') && 
          !(options.headers as Record<string, any>)?.[`Content-Type`] ?
          { 'Content-Type': 'application/json' } : {})
      }
    });
  } catch (error) {
    console.error(`Erro ao conectar à API (${url}):`, error);
    throw error;
  }
};