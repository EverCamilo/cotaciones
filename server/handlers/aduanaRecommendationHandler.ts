import { Request, Response } from 'express';
import { calculateMockDistance } from './mockDistanceHandler';
import { calculateDistanceInternal, DistanceCalculationParams } from './distanceHandler';
import { AduanaInfo, calculateTrucks, calculateInsuranceCost, calculateFreightBase } from '../../client/src/utils/aduanaHelper';
import { storage } from '../storage';

// Interface para itens de custo
interface CostItem {
  item: string;
  details: string;
  value: number;
  isReferenceOnly?: boolean;
}

// Função para converter moedas
function convertCurrency(
  amount: number,
  fromCurrency: 'USD' | 'BRL' | 'GS',
  toCurrency: 'USD' | 'BRL' | 'GS',
  rates: { USD_BRL: number; USD_GS: number }
): number {
  // Converte para USD primeiro
  let amountUSD = amount;
  if (fromCurrency === 'BRL') {
    amountUSD = amount / rates.USD_BRL;
  } else if (fromCurrency === 'GS') {
    amountUSD = amount / rates.USD_GS;
  }
  
  // Depois converte de USD para a moeda desejada
  if (toCurrency === 'USD') {
    return amountUSD;
  } else if (toCurrency === 'BRL') {
    return amountUSD * rates.USD_BRL;
  } else {
    return amountUSD * rates.USD_GS;
  }
}

// Função para calcular custos de aduana
function calculateAdunaCosts(
  aduanaInfo: AduanaInfo,
  tonnage: number,
  trucks: number,
  driverPaymentBRL: number,
  merchandiseValueUSD: number,
  includeInsurance: boolean,
  specialHandling: boolean,
  customsProcess: string,
  exchangeRates: { USD_BRL: number; USD_GS: number },
  company_pays_balsa: boolean = true
): CostItem[] {
  const costs: CostItem[] = [];
  
  // Diagnóstico detalhado - verificar se os valores de FAF estão corretos
  console.log(`[COSTS] Valores de FAF para ${aduanaInfo.nome || (aduanaInfo as any).name}:`, {
    faf_per_truck: aduanaInfo.faf_per_truck,
    faf_lot_1000: aduanaInfo.faf_lot_1000,
    faf_lot_1500: aduanaInfo.faf_lot_1500,
    fafPerTruck: (aduanaInfo as any).fafPerTruck,
    fafLot1000: (aduanaInfo as any).fafLot1000,
    fafLot1500: (aduanaInfo as any).fafLot1500,
  });
  
  // FAF cost - verificar todos os possíveis formatos de dados (estrutura plana e aninhada)
  // Nos certificamos de verificar tanto a estrutura plana quanto a estrutura aninhada
  let perTruckGS = 0;
  
  // Verificar todos os possíveis caminhos para o valor FAF por caminhão
  if (aduanaInfo.faf_per_truck) {
    perTruckGS = aduanaInfo.faf_per_truck;
  } else if ((aduanaInfo as any).fafPerTruck) {
    perTruckGS = parseFloat((aduanaInfo as any).fafPerTruck) || 0;
  } else if ((aduanaInfo as any).faf && (aduanaInfo as any).faf.perTruck) {
    // Verificar estrutura aninhada (formato atual do banco)
    perTruckGS = parseFloat((aduanaInfo as any).faf.perTruck) || 0;
    console.log(`[COSTS] ✅ Usando valor FAF.perTruck da estrutura aninhada: ${perTruckGS}`);
  }
  
  console.log(`[COSTS] Valor FAF por caminhão (final): ${perTruckGS} GS`);
  const perTruckTotalGS = trucks * perTruckGS;
  
  let lotValueGS = 0;
  if (tonnage <= 1000) {
    // Verificar todos os possíveis caminhos para o valor FAF lote 1000
    if (aduanaInfo.faf_lot_1000) {
      lotValueGS = aduanaInfo.faf_lot_1000;
    } else if ((aduanaInfo as any).fafLot1000) {
      lotValueGS = parseFloat((aduanaInfo as any).fafLot1000) || 0;
    } else if ((aduanaInfo as any).faf && (aduanaInfo as any).faf.lot1000) {
      // Verificar estrutura aninhada (formato atual do banco)
      lotValueGS = parseFloat((aduanaInfo as any).faf.lot1000) || 0;
      console.log(`[COSTS] ✅ Usando valor FAF.lot1000 da estrutura aninhada: ${lotValueGS}`);
    }
  } else {
    // Verificar todos os possíveis caminhos para o valor FAF lote 1500
    if (aduanaInfo.faf_lot_1500) {
      lotValueGS = aduanaInfo.faf_lot_1500;
    } else if ((aduanaInfo as any).fafLot1500) {
      lotValueGS = parseFloat((aduanaInfo as any).fafLot1500) || 0;
    } else if ((aduanaInfo as any).faf && (aduanaInfo as any).faf.lot1500) {
      // Verificar estrutura aninhada (formato atual do banco)
      lotValueGS = parseFloat((aduanaInfo as any).faf.lot1500) || 0;
      console.log(`[COSTS] ✅ Usando valor FAF.lot1500 da estrutura aninhada: ${lotValueGS}`);
    }
  }
  
  console.log(`[COSTS] Valor FAF lote (final): ${lotValueGS} GS`);
  
  
  const fafCostGS = perTruckTotalGS + lotValueGS;
  const fafCostUSD = convertCurrency(fafCostGS, 'GS', 'USD', exchangeRates);
  
  costs.push({
    item: "FAF",
    details: `Custo FAF: ${fafCostGS.toLocaleString('pt-BR')} GS`,
    value: fafCostUSD
  });
  
  // FULA cost if applicable - verificamos todos os possíveis formatos
  // Verificamos todas as possíveis estruturas (plana ou aninhada)
  let hasFula = false;
  let fulaRate = 0;
  
  // Verificamos primeiro a estrutura plana
  if (aduanaInfo.tem_fula !== undefined) {
    hasFula = aduanaInfo.tem_fula;
  } else if ((aduanaInfo as any).has_fula !== undefined) {
    hasFula = (aduanaInfo as any).has_fula;
  } else if ((aduanaInfo as any).fula && (aduanaInfo as any).fula.enabled !== undefined) {
    // Estrutura aninhada (formato atual do banco)
    hasFula = (aduanaInfo as any).fula.enabled;
    console.log(`[COSTS] ✅ Usando valor fula.enabled da estrutura aninhada: ${hasFula}`);
  }
  
  // Verificamos a taxa de FULA em todos os formatos possíveis
  if (aduanaInfo.custo_fula !== undefined) {
    fulaRate = aduanaInfo.custo_fula;
  } else if ((aduanaInfo as any).fula_cost !== undefined) {
    fulaRate = (aduanaInfo as any).fula_cost;
  } else if ((aduanaInfo as any).fula && (aduanaInfo as any).fula.costPerTon !== undefined) {
    // Estrutura aninhada (formato atual do banco)
    fulaRate = parseFloat((aduanaInfo as any).fula.costPerTon) || 0;
    console.log(`[COSTS] ✅ Usando valor fula.costPerTon da estrutura aninhada: ${fulaRate}`);
  }
  
  console.log(`[COSTS] FULA para ${aduanaInfo.nome || (aduanaInfo as any).name}:`, {
    tem_fula: aduanaInfo.tem_fula,
    has_fula: (aduanaInfo as any).has_fula,
    hasFula: hasFula,
    custo_fula: aduanaInfo.custo_fula,
    fula_cost: (aduanaInfo as any).fula_cost,
    fulaRate: fulaRate,
    fula_aninhado: (aduanaInfo as any).fula
  });
  
  if (hasFula && fulaRate > 0) {
    const fulaCostUSD = tonnage * fulaRate;
    costs.push({
      item: "FULA",
      details: `${tonnage} toneladas × $${fulaRate.toFixed(2)}/ton`,
      value: fulaCostUSD
    });
  }
  
  // Importante: Santa Helena (aduana com balsa) sempre tem balsa paga pela empresa
  // Essa regra deve ser mantida em todos os cálculos para consistência
  const aduanaName = aduanaInfo.nome || (aduanaInfo as any).name || '';
  const isSantaHelena = aduanaName.toLowerCase().includes('santa helena');
  
  // Verificar se tem balsa - verificamos todos os possíveis formatos
  let hasBalsa = false;
  
  // Verificamos a estrutura plana primeiro
  if (aduanaInfo.tem_balsa !== undefined) {
    hasBalsa = aduanaInfo.tem_balsa;
  } else if ((aduanaInfo as any).has_balsa !== undefined) {
    hasBalsa = (aduanaInfo as any).has_balsa;
  } else if ((aduanaInfo as any).balsa && (aduanaInfo as any).balsa.enabled !== undefined) {
    // Estrutura aninhada (formato atual do banco)
    hasBalsa = (aduanaInfo as any).balsa.enabled;
    console.log(`[COSTS] ✅ Usando valor balsa.enabled da estrutura aninhada: ${hasBalsa}`);
  }
  
  // Obter os custos da balsa - verificamos todos os campos possíveis
  let balsaDefaultCost = 0;
  if (aduanaInfo.custo_balsa?.padrao !== undefined) {
    balsaDefaultCost = aduanaInfo.custo_balsa.padrao;
  } else if ((aduanaInfo as any).balsa_cost !== undefined) {
    balsaDefaultCost = (aduanaInfo as any).balsa_cost;
  } else if ((aduanaInfo as any).balsa?.defaultCost !== undefined) {
    // Estrutura aninhada (formato atual do banco)
    balsaDefaultCost = parseFloat((aduanaInfo as any).balsa.defaultCost) || 0;
    console.log(`[COSTS] ✅ Usando valor balsa.defaultCost da estrutura aninhada: ${balsaDefaultCost}`);
  }
  
  let balsaPuertoIndioCost = 0;
  if (aduanaInfo.custo_balsa?.puerto_indio !== undefined) {
    balsaPuertoIndioCost = aduanaInfo.custo_balsa.puerto_indio;
  } else if ((aduanaInfo as any).balsa_puerto_indio !== undefined) {
    balsaPuertoIndioCost = (aduanaInfo as any).balsa_puerto_indio;
  } else if ((aduanaInfo as any).balsa?.puertoIndioCost !== undefined) {
    // Estrutura aninhada (formato atual do banco)
    balsaPuertoIndioCost = parseFloat((aduanaInfo as any).balsa.puertoIndioCost) || 0;
    console.log(`[COSTS] ✅ Usando valor balsa.puertoIndioCost da estrutura aninhada: ${balsaPuertoIndioCost}`);
  }
  
  console.log(`[COSTS] BALSA para ${aduanaName}:`, {
    tem_balsa: aduanaInfo.tem_balsa,
    has_balsa: (aduanaInfo as any).has_balsa,
    hasBalsa,
    balsa_default: balsaDefaultCost,
    balsa_puerto_indio: balsaPuertoIndioCost
  });
  
  // Custo da balsa (apenas se a empresa paga ou se for Santa Helena)
  if (hasBalsa && (company_pays_balsa || isSantaHelena)) {
    // Se tem Puerto Indio cost e é Santa Helena, usa balsa Puerto Indio
    if (balsaPuertoIndioCost > 0 && isSantaHelena) {
      const balsaPuertoCostBRL = trucks * balsaPuertoIndioCost;
      const balsaPuertoCostUSD = convertCurrency(balsaPuertoCostBRL, 'BRL', 'USD', exchangeRates);
      
      costs.push({
        item: "Balsa Puerto Indio",
        details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${balsaPuertoIndioCost.toFixed(2)}`,
        value: balsaPuertoCostUSD
      });
    }
    // Se não é Puerto Indio ou não é Santa Helena, usa a balsa padrão
    else if (balsaDefaultCost > 0) {
      const balsaCostBRL = trucks * balsaDefaultCost;
      const balsaCostUSD = convertCurrency(balsaCostBRL, 'BRL', 'USD', exchangeRates);
      
      costs.push({
        item: "Balsa",
        details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${balsaDefaultCost.toFixed(2)}`,
        value: balsaCostUSD
      });
    }
  }
  
  // Driver payment
  if (driverPaymentBRL > 0) {
    const driverTotalUSD = convertCurrency(driverPaymentBRL * tonnage, 'BRL', 'USD', exchangeRates);
    costs.push({
      item: "Pagamento Motorista",
      details: `${tonnage} toneladas × R$ ${driverPaymentBRL.toFixed(2)}/ton`,
      value: driverTotalUSD
    });
  }
  
  // Add other costs as needed (simplified)
  
  return costs;
}

/**
 * Handler para recomendar a melhor aduana com base na origem, destino e tonelagem.
 * IMPORTANTE: Usamos o mesmo algoritmo que o cálculo completo de frete para garantir
 * consistência nas recomendações.
 */
export const recommendAduana = async (req: Request, res: Response) => {
  try {
    // Log todas as queries para debugging
    console.log("Query params recebidos:", req.query);
    
    const { 
      origin, 
      destination, 
      tonnage, 
      originPlaceId, 
      destinationPlaceId, 
      companyPaysBalsa: companyPaysBalsaStr,
      originLat,
      originLng,
      destinationLat,
      destinationLng
    } = req.query;
    
    // DEBUG: Log detalhado de todos os parâmetros
    console.log(`DEBUG - RECOMENDAÇÃO:
      - Origin: ${origin}
      - Destination: ${destination}
      - Tonnage: ${tonnage}
      - OriginPlaceId: ${originPlaceId}
      - DestinationPlaceId: ${destinationPlaceId}
      - CompanyPaysBalsa: ${companyPaysBalsaStr}
      - OriginLat: ${originLat}
      - OriginLng: ${originLng}
      - DestinationLat: ${destinationLat}
      - DestinationLng: ${destinationLng}
    `);
    
    // Verificação mais detalhada para debug
    if (!origin) console.log("ALERTA: Parâmetro 'origin' está ausente ou vazio");
    if (!destination) console.log("ALERTA: Parâmetro 'destination' está ausente ou vazio");
    
    if (!origin || !destination) {
      return res.status(400).json({ 
        message: 'Campos obrigatórios ausentes. Origem e destino são necessários.' 
      });
    }
    
    // Verificamos se temos place IDs ou coordenadas para cálculo de distância
    const hasPlaceIds = !!(originPlaceId && destinationPlaceId);
    const hasOriginCoordinates = !!(originLat && originLng);
    const hasDestinationCoordinates = !!(destinationLat && destinationLng);
    
    // Verificações mais detalhadas para debug
    console.log("recommendAduana - Verificando dados de localização:", {
      hasPlaceIds,
      hasOriginCoordinates,
      hasDestinationCoordinates,
      originPlaceId,
      destinationPlaceId,
      originLat,
      originLng,
      destinationLat,
      destinationLng
    });
    
    // Se não temos nem place IDs completos nem pelo menos coordenadas parciais, retornamos erro
    const hasValidLocationData = hasPlaceIds || 
                                (hasOriginCoordinates && (destinationPlaceId || hasDestinationCoordinates)) || 
                                (hasDestinationCoordinates && (originPlaceId || hasOriginCoordinates));
    
    if (!hasValidLocationData) {
      console.warn("recommendAduana - Aviso: Dados de localização insuficientes", {
        originPlaceId,
        destinationPlaceId,
        originLat,
        originLng,
        destinationLat,
        destinationLng
      });
      return res.status(400).json({
        message: 'Dados de localização insuficientes. Forneça place IDs ou coordenadas (lat/lng) para origem e destino.',
        error: 'LOCATION_DATA_MISSING'
      });
    }
    
    console.log(`Calculando recomendação de aduana para origem: ${origin}, destino: ${destination}`);
    
    // Lista de aduanas brasileiras para testar - BUSCAMOS OS PONTOS DE TRAVESSIA
    console.log("[RECOMMENDATION] Buscando pontos de travessia do banco de dados");
    
    // Buscar todos os pontos de travessia (crossing points)
    let aduanasFromDB: any[] = [];
    try {
      // Vamos buscar os pontos de travessia, que têm os dados das aduanas mais completos
      const crossingPoints = await fetch('http://localhost:5000/api/crossing-points?nocache=' + Date.now());
      const crossingData = await crossingPoints.json();
      
      if (Array.isArray(crossingData) && crossingData.length > 0) {
        console.log(`[RECOMMENDATION] ✅ Recuperados ${crossingData.length} pontos de travessia`);
        aduanasFromDB = crossingData;
        
        // Log detalhado do primeiro ponto para debug
        if (crossingData[0]) {
          console.log('[RECOMMENDATION] Exemplo de ponto de travessia:', 
            JSON.stringify({
              nome: crossingData[0].name,
              brazilianSide: crossingData[0].brazilianSide,
              faf: crossingData[0].faf
            })
          );
        }
      } else {
        console.log('[RECOMMENDATION] ❓ Sem pontos de travessia disponíveis');
        
        // Tentar buscar aduanas tradicionais como fallback
        aduanasFromDB = await storage.getAllAduanaInfo();
        console.log(`[RECOMMENDATION] ✅ Fallback: Recuperadas ${aduanasFromDB.length} aduanas tradicionais`);
      }
    } catch (error) {
      console.error("[RECOMMENDATION] ❌ Erro ao buscar aduanas do banco:", error);
      // Em caso de erro, vamos definir valores fixos para não quebrar
      aduanasFromDB = [];
    }
    
    // Se não conseguimos dados do banco, usamos uma lista fixa de emergência
    // Adaptamos a verificação para os campos que existem realmente na interface AduanaInfo
    const brazilianAduanas = aduanasFromDB.length > 0 
      ? aduanasFromDB.map(a => {
          // Tentar obter o nome da parte brasileira do ponto de travessia primeiro
          if (a.brazilianSide && a.brazilianSide.name) {
            return a.brazilianSide.name;
          }
          // Senão, tentar obter de outras formas
          return a.nome || a.name || '';
        }).filter(name => name !== '')
      : ["Foz do Iguaçu", "Santa Helena", "Guaíra", "Mundo Novo"];
    
    console.log("[RECOMMENDATION] Aduanas brasileiras usadas:", brazilianAduanas);
    
    // Associação de aduanas brasileiras com suas contrapartes paraguaias - vamos buscar do banco também
    const aduanaPairs: Record<string, string> = {};
    
    // Preencher o mapa de pares de aduanas a partir dos pontos de travessia (nova estrutura)
    aduanasFromDB.forEach(aduana => {
      // Novo formato: Pontos de travessia com brazilianSide e paraguayanSide
      if (aduana.brazilianSide && aduana.paraguayanSide) {
        const brName = aduana.brazilianSide.name;
        const pyName = aduana.paraguayanSide.name;
        if (brName && pyName) {
          console.log(`[RECOMMENDATION] ✅ Par de aduanas encontrado: ${brName} -> ${pyName}`);
          aduanaPairs[brName] = pyName;
        }
      } 
      // Formato legado
      else {
        const aduanaName = aduana.nome || (aduana as any).name;
        const partnerName = (aduana as any).paired_with || (aduana as any).aduana_parceira;
        const country = (aduana as any).country || (aduana as any).pais;
        
        if (country === 'BR' && partnerName) {
          aduanaPairs[aduanaName] = partnerName;
        }
      }
    });
    
    // Se o mapa estiver vazio, preencher com valores fixos de emergência
    if (Object.keys(aduanaPairs).length === 0) {
      console.log("[RECOMMENDATION] Usando pares de aduanas fixos de emergência");
      Object.assign(aduanaPairs, {
        'Foz do Iguaçu': 'Ciudad del Este',
        'Santa Helena': 'Puerto Indio',
        'Guaíra': 'Salto del Guaíra',
        'Mundo Novo': 'Salto del Guaíra'
      });
    }
    
    console.log("[RECOMMENDATION] Mapa de pares de aduanas:", aduanaPairs);
    
    // Configurações padrão para cálculo completo
    const parsedTonnage = typeof tonnage === 'string' ? parseFloat(tonnage) : 1000;
    const requiredTrucks = calculateTrucks(parsedTonnage);
    const driverPayment = 0; // Valor padrão para recomendação
    // Verificar se a empresa paga balsa ou não (parâmetro companyPaysBalsa)
    // Por padrão, a empresa paga balsa, mas isso pode ser alterado via parâmetro
    const companyPaysBalsa = companyPaysBalsaStr === 'false' ? false : true;
    
    // Taxas de câmbio padrão para recomendação
    const exchangeRates = {
      USD_BRL: 5.40,
      USD_GS: 7500.0
    };
    
    // Calculos para cada aduana
    const aduanaResults = await Promise.all(
      brazilianAduanas.map(async (aduanaBr) => {
        // Chamamos o cálculo de distância usando a função interna
        let distanceRes: any = {};

        try {
          // Criamos um objeto com os parâmetros para a função interna
          const params: DistanceCalculationParams = {
            origin: origin as string,
            destination: destination as string,
            aduanaBr,
            origin_place_id: originPlaceId as string || undefined,
            destination_place_id: destinationPlaceId as string || undefined,
            origin_lat: originLat as string || undefined,
            origin_lng: originLng as string || undefined,
            destination_lat: destinationLat as string || undefined,
            destination_lng: destinationLng as string || undefined
          };

          // Chamamos a função interna diretamente
          distanceRes = await calculateDistanceInternal(params);
          console.log(`Distância calculada para ${aduanaBr}: ${distanceRes.totalDistance} km`);
        } catch (error) {
          console.warn(`Erro ao calcular distância para ${aduanaBr}:`, error);
          // Em caso de erro, retornamos um objeto vazio com distância zero
          distanceRes = { totalDistance: 0, originToAduanaPy: 0, aduanaBrToDestination: 0 };
        }
        
        // Obtenção dos dados da rota
        const routeDistance = {
          totalDistance: distanceRes.totalDistance || 0,
          originToAduanaPy: distanceRes.originToAduanaPy || 0,
          aduanaBrToDestination: distanceRes.aduanaBrToDestination || 0
        };
        
        // Obtém informações da aduana diretamente do banco de dados
        console.log(`[RECOMMENDATION] Buscando informações para aduana: ${aduanaBr}`);
        
        // Procurar a aduana na lista que já buscamos do banco
        // PROBLEMA: precisamos verificar o formato de ponto de travessia onde o nome está em brazilianSide.name
        const aduanaInfo = aduanasFromDB.find(a => {
          // Verificar formatos possíveis
          return (
            // Formato original AduanaInfo
            (a.nome === aduanaBr) || 
            // Formato alternativo 
            ((a as any).name === aduanaBr) ||
            // Formato de ponto de travessia
            ((a as any).brazilianSide && (a as any).brazilianSide.name === aduanaBr) || 
            // Nome composto 
            (a.nome && a.nome.includes(aduanaBr)) ||
            ((a as any).name && (a as any).name.includes(aduanaBr))
          );
        });
        
        if (!aduanaInfo) {
          console.log(`[RECOMMENDATION] ⚠️ Aduana ${aduanaBr} não encontrada no banco de dados`);
          
          // Não temos informações desta aduana, não incluímos no cálculo
          return {
            aduanaName: aduanaBr,
            distance: routeDistance.totalDistance,
            totalForComparison: Number.MAX_SAFE_INTEGER, // Valor alto para não ser escolhido
            totalCost: 0
          };
        }
        
        console.log(`[RECOMMENDATION] ✅ Informações da aduana ${aduanaBr} encontradas:`, aduanaInfo);
        
        // Calcula o custo do frete base para comparação
        const freightBaseCost = calculateFreightBase(routeDistance.totalDistance, parsedTonnage);
        
        // Obtém a aduana paraguaia correspondente
        const aduanaPy = aduanaPairs[aduanaBr] || "";
        
        // Calcula os custos de aduana usando a função definida acima
        const aduanaCosts = calculateAdunaCosts(
          aduanaInfo,
          parsedTonnage,
          requiredTrucks,
          driverPayment,
          0, // Valor da mercadoria - não usado para recomendação
          true, // Incluir seguro
          false, // Sem manuseio especial
          'normal', // Processo normal
          exchangeRates,
          companyPaysBalsa
        );
        
        // Log de detalhes de custos por aduana para debug
        console.log(`\n==== CUSTOS DETALHADOS PARA ${aduanaBr.toUpperCase()} ====`);
        aduanaCosts.forEach(c => {
          console.log(`- ${c.item}: $${c.value.toFixed(2)} USD (${c.details})`);
        });
        console.log(`Distância total: ${routeDistance.totalDistance.toFixed(2)} km`);
        console.log(`Frete base de referência: $${freightBaseCost.toFixed(2)} USD`);
        console.log("===============================================");
        
        
        // Adicionamos o custo do frete base como um item especial (isReferenceOnly=true)
        aduanaCosts.unshift({
          item: "Frete Base (Referência)",
          details: `(${Math.round(routeDistance.totalDistance)} km ÷ 25) × ${parsedTonnage} toneladas - *APENAS PARA CÁLCULO INTERNO*`,
          value: freightBaseCost,
          isReferenceOnly: true
        });
        
        // Calcula o custo total apenas com itens reais (sem os marcados como isReferenceOnly)
        const totalCost = aduanaCosts.reduce((sum: number, item: CostItem) => {
          // Se o item for apenas referência (como o frete base), não soma ao custo total real
          if (item.isReferenceOnly) return sum;
          return sum + item.value;
        }, 0);
        
        // Obtém o valor do frete base (item marcado como isReferenceOnly)
        const freightBaseItem = aduanaCosts.find(c => c.isReferenceOnly);
        const freightBaseValue = freightBaseItem?.value || 0;
        
        // IMPORTANTE: Para comparação entre aduanas, somamos o custo total COM o frete base
        // Exatamente como é feito no cálculo completo em freightCalculationHandler.ts
        const totalForComparison = totalCost + freightBaseValue;
        
        return {
          aduanaName: aduanaBr,
          aduanaPy: aduanaPy,
          distance: routeDistance.totalDistance,
          totalCost: totalCost,
          totalForComparison: totalForComparison,
          costPerTon: totalCost / parsedTonnage,
          routeDetails: {
            originToCustoms: routeDistance.originToAduanaPy,
            customsToDestination: routeDistance.aduanaBrToDestination,
            total: routeDistance.totalDistance
          }
        };
      })
    );
    
    // Filtra os resultados com distância válida
    const validResults = aduanaResults.filter(result => result.distance > 0);
    
    if (validResults.length === 0) {
      return res.status(500).json({ 
        message: 'Não foi possível calcular distâncias para nenhuma aduana.' 
      });
    }
    
    // Ordena por custo total incluindo frete base e pega o melhor
    const sortedResults = [...validResults].sort((a, b) => a.totalForComparison - b.totalForComparison);
    const bestResult = sortedResults[0];
    
    // Preparar resposta
    const response = {
      recommendation: bestResult.aduanaName,
      distances: Object.fromEntries(validResults.map(r => [r.aduanaName, r.distance])),
      totalCosts: Object.fromEntries(validResults.map(r => [r.aduanaName, r.totalCost])),
      totalWithFreight: Object.fromEntries(validResults.map(r => [r.aduanaName, r.totalForComparison])),
      details: Object.fromEntries(validResults.map(r => [r.aduanaName, r.routeDetails])),
      costPerTon: Object.fromEntries(validResults.map(r => [r.aduanaName, r.costPerTon])),
      allResults: validResults, // Incluímos todos os resultados detalhados para debug
      algorithm: 'complete' // Indicamos que usamos o algoritmo completo
    };
    
    console.log(`Aduana recomendada: ${bestResult.aduanaName}`);
    console.log(`Detalhes da recomendação:
      - Distância total: ${bestResult.distance.toFixed(2)} km
      - Custo total (sem frete): $${bestResult.totalCost.toFixed(2)} USD
      - Custo por tonelada: $${(bestResult.totalCost / parsedTonnage).toFixed(2)} USD/Tn
      - Valor para comparação: $${bestResult.totalForComparison.toFixed(2)} USD
    `);
    
    // Log detailed costs for each aduana
    console.log("Comparação de custos entre aduanas:");
    validResults.forEach(result => {
      console.log(`${result.aduanaName}: 
        Distância: ${result.distance.toFixed(2)} km, 
        Custo: $${result.totalCost.toFixed(2)} USD, 
        Custo/Tn: $${(result.totalCost / parsedTonnage).toFixed(2)} USD/Tn, 
        Comparação: $${result.totalForComparison.toFixed(2)} USD`
      );
    });
    return res.json(response);
    
  } catch (error) {
    console.error('Erro ao recomendar aduana:', error);
    return res.status(500).json({ 
      message: 'Falha ao calcular recomendação de aduana',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};