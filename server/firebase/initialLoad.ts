/**
 * Módulo de inicialização do sistema
 * 
 * IMPORTANTE: MODIFICAÇÃO DA ESTRATÉGIA DE DADOS PARA NÃO USAR CACHE
 * -------------------------------
 * Conforme solicitado pelo cliente, todas as requisições devem:
 * 1. Sempre buscar dados diretamente na fonte (Firebase)
 * 2. Não manter nenhum tipo de cache local no servidor
 * 3. Garantir que todos os dados sejam sempre os mais atualizados possíveis
 * 
 * Esta função é mantida apenas para compatibilidade, mas não armazena
 * mais nenhum dado em cache.
 */

import { storage } from '../storage';

// Importante: Não importamos mais dataCache ou lastUpdateTime pois não usamos cache

/**
 * Inicializa o sistema sem armazenar nenhum dado em cache
 * Apenas verifica se há conexão com o Firebase e logs esta informação
 */
export async function loadInitialData(): Promise<void> {
  console.log('Iniciando verificação de conectividade do Firebase...');
  
  try {
    // Apenas verificar conectividade com o Firebase, sem armazenar dados
    console.log('Fetching freight quote history from Firebase...');
    await storage.getFreightQuoteHistory();
    
    // Log de verificação bem-sucedida, mas NÃO armazenamos nada em cache
    console.log('Carregamento inicial de dados concluído com sucesso');
    return Promise.resolve();
  } catch (error) {
    console.error('Erro de conectividade com o Firebase:', error);
    return Promise.reject(error);
  }
}