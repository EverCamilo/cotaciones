import { CrossingPoint, getCrossingPointByBrazilianAduana, parseNumericValue } from './crossingPointHelper';
import { AduanaInfo } from './aduanaHelper';
import { apiRequest } from '@/lib/queryClient';

/**
 * Obtém o valor do FAF para um ponto de travessia baseado na tonelagem e número de caminhões
 * Sempre busca dados diretamente do banco de dados para evitar valores em cache
 */
export async function getFAFValue(
  aduanaName: string, 
  tonnage: number, 
  trucks: number
): Promise<number> {
  try {
    console.log(`[FAF] Calculando FAF para ${aduanaName} (${tonnage} ton, ${trucks} caminhões)`);
    
    // Buscar dados sempre frescos com timestamp anti-cache
    const timestamp = new Date().getTime();
    const url = `/api/crossing-points?_t=${timestamp}`;
    
    console.log(`[FAF] Buscando dados SEMPRE FRESCOS do banco com timestamp: ${timestamp}`);
    
    // Headers anti-cache para garantir dados novos a cada requisição
    const response = await apiRequest('GET', url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const allPoints = await response.json();
    
    // Encontrar o ponto correspondente à aduana brasileira
    const crossingPoint = allPoints.find(
      (point: CrossingPoint) => point.brazilianSide.name === aduanaName
    );
    
    if (!crossingPoint) {
      console.error(`[FAF] Ponto de travessia não encontrado para ${aduanaName}`);
      return 0;
    }
    
    // Log dos valores obtidos do banco - DETALHADOS
    const rawPerTruck = crossingPoint.faf.perTruck;
    const parsedPerTruck = parseNumericValue(rawPerTruck);
    
    console.log(`[FAF] Valores do banco para ${aduanaName} - DETALHADOS:`, {
      perTruck_raw: rawPerTruck,
      perTruck_raw_type: typeof rawPerTruck,
      perTruck_parsed: parsedPerTruck,
      perTruck_parsed_type: typeof parsedPerTruck,
      lot1000_raw: crossingPoint.faf.lot1000,
      lot1500_raw: crossingPoint.faf.lot1500
    });
    
    // SUPER IMPORTANTE: Aqui é onde os valores FAF são efetivamente calculados!
    // Vamos garantir que usamos SOMENTE os valores do banco de dados.
    let fafValue = 0;
    
    // DEPURAÇÃO: Mostrar valores brutos antes da conversão
    console.log(`[FAF DEBUG CRÍTICO] Valores brutos do crossingPoint:`, {
      perTruck: crossingPoint.faf.perTruck,
      lot1000: crossingPoint.faf.lot1000,
      lot1500: crossingPoint.faf.lot1500
    });
    
    // Verificação de valores para diagnóstico - sem forçar nada
    if (aduanaName === 'Santa Helena') {
      // Apenas verificar para diagnóstico
      const perTruckValue = parseNumericValue(crossingPoint.faf.perTruck);
      console.log(`[FAF Santa Helena] DADOS DO BANCO: perTruckValue=${perTruckValue}, valor bruto=${crossingPoint.faf.perTruck}`);
    }
    
    if (tonnage <= 1000) {
      // Para pequenos lotes, usar valor por caminhão
      const perTruckValue = parseNumericValue(crossingPoint.faf.perTruck);
      fafValue = perTruckValue * trucks;
      console.log(`[FAF] Usando valor por caminhão: ${perTruckValue} * ${trucks} = ${fafValue}`);
    } else if (tonnage <= 1500) {
      // Para lotes médios, usar lote 1000
      fafValue = parseNumericValue(crossingPoint.faf.lot1000);
      console.log(`[FAF] Usando valor para lotes até 1000 ton: ${fafValue}`);
    } else {
      // Para grandes lotes, usar lote 1500
      fafValue = parseNumericValue(crossingPoint.faf.lot1500);
      console.log(`[FAF] Usando valor para lotes acima de 1000 ton: ${fafValue}`);
    }
    
    return fafValue;
  } catch (error) {
    console.error('[FAF] Erro ao obter valor FAF do ponto de travessia:', error);
    return 0;
  }
}

/**
 * Obtém os dados completos de um ponto de travessia pelo nome da aduana brasileira
 * Sempre busca dados frescos do banco de dados, sem usar cache
 */
export async function getAduanaInfoFromCrossingPoint(aduanaName: string): Promise<AduanaInfo | null> {
  try {
    // Forçar busca direta da API para obter dados atualizados do banco
    console.log(`[Aduana] Buscando dados atualizados para ${aduanaName} diretamente do banco`);
    
    // Buscar dados sempre frescos com timestamp anti-cache
    const timestamp = new Date().getTime();
    const url = `/api/crossing-points?_t=${timestamp}`;
    
    console.log(`[Aduana] Buscando dados SEMPRE FRESCOS do banco com timestamp: ${timestamp}`);
    
    // Headers anti-cache para garantir dados novos a cada requisição
    const response = await apiRequest('GET', url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const allPoints = await response.json();
    
    // Encontrar o ponto correspondente à aduana brasileira
    const crossingPoint = allPoints.find(
      (point: CrossingPoint) => point.brazilianSide.name === aduanaName
    );
    
    if (!crossingPoint) {
      console.error(`[Aduana] Ponto de travessia não encontrado para ${aduanaName}`);
      return null;
    }
    
    console.log(`[Aduana] Encontrado ponto de travessia para ${aduanaName}:`, {
      id: crossingPoint.id,
      nome: crossingPoint.name,
      fafPerTruck: crossingPoint.faf.perTruck
    });
    
    // Converter para formato AduanaInfo e retornar
    return convertCrossingPointToAduanaInfo(crossingPoint);
  } catch (error) {
    console.error(`[Aduana] Erro ao obter dados para ${aduanaName}:`, error);
    return null;
  }
}

/**
 * Converte info do ponto de travessia para formato AduanaInfo legado
 * Isso é necessário durante a transição para o novo modelo
 */
export function convertCrossingPointToAduanaInfo(point: CrossingPoint): AduanaInfo {
  // Log para depuração dos valores FAF
  console.log('[Aduana] Valores FAF do banco de dados:', {
    nome: point.brazilianSide.name,
    perTruck: point.faf.perTruck,
    perTruckNum: parseNumericValue(point.faf.perTruck),
    lot1000: point.faf.lot1000,
    lot1000Num: parseNumericValue(point.faf.lot1000),
    lot1500: point.faf.lot1500,
    lot1500Num: parseNumericValue(point.faf.lot1500)
  });

  return {
    nome: point.brazilianSide.name,
    faf_per_truck: parseNumericValue(point.faf.perTruck),
    faf_lot_1000: parseNumericValue(point.faf.lot1000),
    faf_lot_1500: parseNumericValue(point.faf.lot1500),
    has_fula: point.fula.enabled,
    fula_cost: point.fula.enabled ? parseNumericValue(point.fula.costPerTon) : undefined,
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
}