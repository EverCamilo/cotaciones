import { apiRequest } from "@/lib/queryClient";

export interface CrossingPoint {
  id?: string;
  name: string;
  description: string;
  active: boolean;
  brazilianSide: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  paraguayanSide: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  faf: {
    perTruck: string;
    lot1000: string;
    lot1500: string;
  };
  fula: {
    enabled: boolean;
    costPerTon: string | null;
  };
  mapa: {
    costPerTon: string | null;
    acerto: string | null;
    fixo: string | null;
    lot1000: string | null;
    lot1500: string | null;
  };
  dinatran: {
    enabled: boolean;
    costPerTruck: string | null;
  };
  balsa: {
    enabled: boolean;
    defaultCost: number | null;
    puertoIndioCost: number | null;
    sangaFundaCost: number | null;
  };
  estacionamento: {
    enabled: boolean;
    costPerTruck: string | null;
  };
  comissaoLuiz: {
    enabled: boolean;
    costPerTon: string | null;
  };
  otherFees: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// IMPORTANTE: Removemos o cache para SEMPRE buscar dados frescos do banco
// Isso garante que as alterações feitas no painel de configuração sejam aplicadas imediatamente

/**
 * Obtém todos os pontos de travessia do servidor
 * Buscando sempre do banco para garantir dados atualizados
 */
export async function getAllCrossingPoints(): Promise<CrossingPoint[]> {
  try {
    // Adicionar timestamp para evitar qualquer cache de navegador
    const timestamp = new Date().getTime();
    // Use apenas o caminho relativo
    const url = `/api/crossing-points?_t=${timestamp}`;
    
    console.log('[CrossingPoints] Buscando dados SEMPRE FRESCOS do banco:', url);
    
    // Adicionar parâmetros no-cache nas headers
    const response = await apiRequest('GET', url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const data = await response.json();
    
    // Log para diagnóstico
    console.log(`[CrossingPoints] Recebidos ${data.length} pontos de travessia diretamente do banco`);
    
    return data;
  } catch (error) {
    console.error('[CrossingPoints] Erro ao buscar pontos de travessia:', error);
    return [];
  }
}

/**
 * Obtém um ponto de travessia específico pelo nome
 */
export async function getCrossingPointByName(name: string): Promise<CrossingPoint | null> {
  const points = await getAllCrossingPoints();
  return points.find(point => point.name === name) || null;
}

/**
 * Obtém um ponto de travessia específico pelo ID
 */
export async function getCrossingPointById(id: string): Promise<CrossingPoint | null> {
  const points = await getAllCrossingPoints();
  return points.find(point => point.id === id) || null;
}

/**
 * Obtém um ponto de travessia pela aduana brasileira
 */
export async function getCrossingPointByBrazilianAduana(aduanaName: string): Promise<CrossingPoint | null> {
  const points = await getAllCrossingPoints();
  return points.find(point => point.brazilianSide.name === aduanaName) || null;
}

/**
 * Converte um valor de string para número
 * Com melhorias para garantir consistência entre formatos diferentes
 */
export function parseNumericValue(value: string | null): number {
  if (!value) return 0;
  
  // Remover todos os caracteres não numéricos, exceto pontos e hífens
  let cleanedValue = value.replace(/[^\d.-]/g, '');
  
  // Remover especificações de valores fixos
  // Converter qualquer valor formatado com pontos para formato numérico
  
  // Log para depuração com mais informações
  console.log(`[parseNumericValue] Convertendo "${value}" -> "${cleanedValue}" -> ${parseFloat(cleanedValue)}`);
  
  return parseFloat(cleanedValue) || 0;
}

/**
 * Função mantida por compatibilidade, mas não é mais necessária 
 * já que removemos o cache e sempre buscamos dados frescos
 */
export function clearCrossingPointsCache() {
  console.log('[CrossingPoints] Cache não está mais sendo usado, sempre buscando dados frescos');
  // Não faz nada, pois removemos o cache
}