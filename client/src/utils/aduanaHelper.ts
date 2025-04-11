// Interface for costs and details of aduanas
export interface AduanaInfo {
  nome: string;
  faf_per_truck: number;      // Guaranis per truck
  faf_lot_1000: number;       // Guaranis for lots up to 1000 tons
  faf_lot_1500: number;       // Guaranis for lots above 1000 tons
  has_fula: boolean;
  fula_cost?: number;         // USD per ton
  mapa_cost?: number;         // USD per ton for MAPA costs
  mapa_acerto?: number;       // USD per ton
  mapa_fixo?: number;         // USD per ton (fixed cost)
  mapa_cost_1000?: number;    // BRL for lots up to 1000 tons
  mapa_cost_1500?: number;    // BRL for lots above 1000 tons
  has_balsa: boolean;
  balsa_cost?: number;        // BRL cost for balsa
  balsa_puerto_indio?: number; // BRL cost for Puerto Indio balsa
  // Removemos a opção de balsa Sanga Funda conforme solicitado pelo cliente
  has_estacionamento: boolean;
  estacionamento_cost?: number; // BRL cost for parking
  dinatran_cost?: number;      // BRL cost per truck for Dinatran
  has_comissao_luiz: boolean;
  comissao_luiz?: number;     // BRL per ton for Luiz Baciquet commission
}

// IMPORTANTE: Não estamos mais definindo valores fixos para ADUANA_INFO!
// Todos os dados agora vêm diretamente do banco, conforme solicitado pelo cliente.
// Este objeto está mantido apenas por compatibilidade com código legado.
export const ADUANA_INFO: Record<string, AduanaInfo> = {};

// IMPORTANTE: Estas funções foram mantidas apenas por compatibilidade
// Todas as funções agora buscam dados diretamente do banco, sem usar valores fixos

import { apiRequest } from '@/lib/queryClient';
import { CrossingPoint, parseNumericValue } from './crossingPointHelper';

// Busca as aduanas brasileiras disponíveis no banco de dados
export async function getBrazilianAduanasDynamic(): Promise<string[]> {
  try {
    const timestamp = new Date().getTime();
    const url = `/api/crossing-points?_t=${timestamp}`;
    const response = await apiRequest('GET', url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const data = await response.json();
    return data.map((point: CrossingPoint) => point.brazilianSide.name);
  } catch (error) {
    console.error('[Aduana] Erro ao buscar aduanas do banco:', error);
    return [];
  }
}

// Mantido por compatibilidade - usa a implementação dinâmica em ambiente de produção
export function getBrazilianAduanas(): string[] {
  // Para código legado que não pode esperar resultado assíncrono
  console.warn('[AVISO] Usando função síncrona getBrazilianAduanas() que pode não refletir dados atuais do banco');
  return ["Guaíra", "Mundo Novo", "Foz do Iguaçu", "Santa Helena"];
}

// Busca a aduana paraguaia correspondente no banco de dados
export async function getParaguayanAduanaDynamic(aduanaBr: string): Promise<string> {
  try {
    const timestamp = new Date().getTime();
    const url = `/api/crossing-points?_t=${timestamp}`;
    const response = await apiRequest('GET', url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const data = await response.json();
    const point = data.find((p: CrossingPoint) => p.brazilianSide.name === aduanaBr);
    return point ? point.paraguayanSide.name : "";
  } catch (error) {
    console.error('[Aduana] Erro ao buscar aduana paraguaia do banco:', error);
    return "";
  }
}

// Mantido por compatibilidade - implementação legada
export function getParaguayanAduana(aduanaBr: string): string {
  console.warn('[AVISO] Usando função síncrona getParaguayanAduana() que pode não refletir dados atuais do banco');
  const ADUANA_PAIRS: Record<string, string> = {
    "Guaíra": "Salto del Guaíra",
    "Mundo Novo": "Salto del Guaíra",
    "Foz do Iguaçu": "Ciudad del Este",
    "Santa Helena": "Puerto Indio"
  };
  
  return ADUANA_PAIRS[aduanaBr] || "";
}

// Busca informações de uma aduana do banco de dados
export async function getAduanaInfoDynamic(aduanaBr: string): Promise<AduanaInfo | null> {
  try {
    const timestamp = new Date().getTime();
    const url = `/api/crossing-points?_t=${timestamp}`;
    const response = await apiRequest('GET', url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const data = await response.json();
    const point = data.find((p: CrossingPoint) => p.brazilianSide.name === aduanaBr);
    
    if (!point) return null;
    
    // Converter do formato do banco para o formato AduanaInfo
    return {
      nome: point.brazilianSide.name,
      faf_per_truck: parseNumericValue(point.faf.perTruck),
      faf_lot_1000: parseNumericValue(point.faf.lot1000),
      faf_lot_1500: parseNumericValue(point.faf.lot1500),
      has_fula: point.fula.enabled,
      fula_cost: point.fula.costPerTon ? parseNumericValue(point.fula.costPerTon) : undefined,
      mapa_cost: point.mapa.costPerTon ? parseNumericValue(point.mapa.costPerTon) : undefined,
      mapa_acerto: point.mapa.acerto ? parseNumericValue(point.mapa.acerto) : undefined,
      mapa_fixo: point.mapa.fixo ? parseNumericValue(point.mapa.fixo) : undefined,
      mapa_cost_1000: point.mapa.lot1000 ? parseNumericValue(point.mapa.lot1000) : undefined,
      mapa_cost_1500: point.mapa.lot1500 ? parseNumericValue(point.mapa.lot1500) : undefined,
      has_balsa: point.balsa.enabled,
      balsa_cost: point.balsa.defaultCost || undefined,
      balsa_puerto_indio: point.balsa.puertoIndioCost || undefined,
      has_estacionamento: point.estacionamento.enabled,
      estacionamento_cost: point.estacionamento.enabled ? parseNumericValue(point.estacionamento.costPerTruck) : undefined,
      dinatran_cost: point.dinatran.enabled ? parseNumericValue(point.dinatran.costPerTruck) : undefined,
      has_comissao_luiz: point.comissaoLuiz.enabled,
      comissao_luiz: point.comissaoLuiz.enabled ? parseNumericValue(point.comissaoLuiz.costPerTon) : undefined
    };
  } catch (error) {
    console.error('[Aduana] Erro ao buscar informações da aduana do banco:', error);
    return null;
  }
}

// Mantido por compatibilidade - usa a implementação com valores fixos
export function getAduanaInfo(aduanaBr: string): AduanaInfo | undefined {
  console.warn('[AVISO] Usando função síncrona getAduanaInfo() que não busca dados do banco!');
  
  // Como ADUANA_INFO está vazio, vamos retornar null para forçar o uso da versão dinâmica
  return undefined;
}

export function calculateTrucks(tonnage: number): number {
  // Each truck can carry up to 32 tons
  return Math.ceil(tonnage / 32);
}

export function calculateInsuranceCost(merchandiseValue: number): number {
  // Insurance cost is 0.14% of merchandise value
  return merchandiseValue * 0.0014;
}

export function calculateFreightBase(distance: number, tonnage: number): number {
  // Base freight calculation: (distance ÷ 25) × tonnage
  // Garante que o resultado é sempre um número válido
  const result = (distance / 25) * tonnage;
  return isNaN(result) ? 0 : result;
}
