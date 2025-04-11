import { AduanaInfo, ADUANA_INFO, calculateTrucks, calculateInsuranceCost, calculateFreightBase } from './aduanaHelper';
import { convertCurrency } from './currencyConverter';
// Substitui a importação de calculateRouteDistance por uma função que usa a API
import { apiRequest } from '../lib/queryClient';
import { FreightQuote, AduanaDetails, CostItem } from '../contexts/FreightContext';

interface ExchangeRates {
  USD_BRL: number;
  USD_GS: number;
}

interface CalculationResult {
  recommendedAduana: string;
  totalCost: number;
  costPerTon: number;
  totalDistance: number;
  requiredTrucks: number;
  exchangeRate: number;
  estimatedProfit: number;
  costBreakdown: CostItem[];
  aduanaComparison: AduanaDetails[];
  customsDetails: {
    originLocation: string;
    destinationLocation: string;
    customsPoint: string;
  };
}

export async function performFreightCalculation(
  quoteData: FreightQuote,
  exchangeRates: ExchangeRates
): Promise<CalculationResult> {
  // Importando a função para limpar o cache de pontos de travessia
  // Isso garante que teremos dados atualizados do banco
  const { clearCrossingPointsCache, getAllCrossingPoints } = await import('./crossingPointHelper');
  clearCrossingPointsCache(); // Limpa o cache para garantir dados frescos
  const { origin, destination, tonnage, driverPayment, profitMargin, merchandiseValue, customsDetails } = quoteData;

  // Obter todos os pontos de travessia do banco de dados
  // Isso é crítico para usar valores atualizados em vez dos valores hardcoded
  const crossingPoints = await getAllCrossingPoints();
  console.log('[Cálculo] Pontos de travessia carregados do banco:', crossingPoints.length);
  
  // Extrair apenas os nomes das aduanas brasileiras
  const availableAduanas = crossingPoints.map(point => point.brazilianSide.name);
  console.log('[Cálculo] Aduanas disponíveis:', availableAduanas);
  
  // Se o usuário forçar uma aduana específica, SOMENTE cálcula para aquela aduana
  // Verificar todas as possíveis fontes de informação sobre a aduana preferida
  const forceAduana = (window as any).__CRITICAL_VALUES__?.forceAduana;
  const selectedAduana = (window as any).__CRITICAL_VALUES__?.selectedAduana;
  
  // Usar a aduana forçada se estiver definida, caso contrário usar a preferredAduana
  const preferredAduana = forceAduana ? selectedAduana : customsDetails?.preferredAduana;
  
  // Aplicar a lógica de seleção
  const aduanasToCalculate = (preferredAduana && preferredAduana !== 'auto')
    ? [preferredAduana] 
    : availableAduanas;

  // Calculate required trucks
  const requiredTrucks = calculateTrucks(tonnage);
  
  // Calculate for each possible aduana
  const aduanaResults = await Promise.all(
    aduanasToCalculate.map(async (aduanaName) => {
      // Chamar a API para calcular distâncias entre origem/destino via aduana
      const response = await apiRequest(
        "POST", 
        "/api/distance/calculate", 
        { 
          origin, 
          destination, 
          aduanaBr: aduanaName,
          origin_place_id: quoteData.originPlaceId, 
          destination_place_id: quoteData.destinationPlaceId 
        }
      );
      
      const distanceData = await response.json();
      
      // Extrair as informações de distância da resposta da API
      const routeDistance = {
        totalDistance: distanceData.totalDistance || 0,
        originToAduanaPy: distanceData.originToAduanaPy || 0,
        aduanaBrToDestination: distanceData.aduanaBrToDestination || 0
      };
      // IMPORTANTE: SEMPRE buscar informações da aduana diretamente do banco de dados
      // NUNCA usar ADUANA_INFO, que contém valores fixos hardcoded
      const { getAduanaInfoFromCrossingPoint } = await import('./calculationUtils');
      
      // Obter informações SOMENTE do banco de dados
      console.log(`[Aduana] Buscando EXCLUSIVAMENTE dados do banco para ${aduanaName}`);
      const aduanaInfoFromDB = await getAduanaInfoFromCrossingPoint(aduanaName);
      
      if (!aduanaInfoFromDB) {
        console.error(`[ERRO CRÍTICO] Não foi possível obter dados do banco para ${aduanaName}`);
        throw new Error(`Dados não encontrados para aduana ${aduanaName}`);
      }
      
      // Usando SOMENTE os dados obtidos do banco de dados
      const aduanaInfo = aduanaInfoFromDB;
      
      // Calculate base freight cost
      const freightBaseCost = calculateFreightBase(routeDistance.totalDistance, tonnage);
      
      // Get paired Paraguayan aduana
      const getParaguayanAduana = (brazilianAduana: string): string => {
        const pairs: Record<string, string> = {
          "Guaíra": "Salto del Guaíra",
          "Mundo Novo": "Salto del Guaíra",
          "Foz do Iguaçu": "Ciudad del Este",
          "Santa Helena": "Puerto Indio"
        };
        
        return pairs[brazilianAduana] || "";
      };
      
      // Calculate all costs for this aduana
      // Verifica se a configuração de pagamento da balsa foi definida pelo usuário
      const companyPaysBalsa = customsDetails?.companyPaysBalsa === true;
      
      // Santa Helena é um caso especial - a empresa sempre paga a balsa
      const isSantaHelena = aduanaName === 'Santa Helena';
      const shouldCompanyPayBalsa = companyPaysBalsa || isSantaHelena;
      
      console.log(`Calculando custos para aduana ${aduanaName}, empresa paga balsa: ${shouldCompanyPayBalsa}, 
                  configuração do usuário: ${customsDetails?.companyPaysBalsa}, 
                  é Santa Helena: ${isSantaHelena}`);
      
      const costs = await calculateAdunaCosts(
        aduanaName, // Adicionamos o nome da aduana como primeiro parâmetro
        aduanaInfo,
        tonnage,
        requiredTrucks,
        driverPayment,
        merchandiseValue,
        customsDetails?.includeInsurance ?? true,
        customsDetails?.specialHandling ?? false,
        customsDetails?.customsProcess ?? 'normal',
        exchangeRates,
        shouldCompanyPayBalsa // Passando o parâmetro para o cálculo de balsa
      );
      
      // Log para depuração dos custos
      console.log(`[Aduana] Custos calculados para ${aduanaName}:`, costs);
      
      // Sum all costs
      const totalCostWithoutProfit = costs.reduce((sum, item) => sum + item.value, 0);
      
      // Add profit margin
      const profitAmount = tonnage * profitMargin;
      
      // Calculate total with profit
      const totalCost = totalCostWithoutProfit + profitAmount;
      
      // Calculate cost per ton
      const costPerTon = totalCost / tonnage;
      
      // Return result for this aduana
      return {
        aduanaName,
        aduanaPY: getParaguayanAduana(aduanaName),
        distance: routeDistance.totalDistance,
        costBreakdown: [
          ...costs,
          {
            item: "Subtotal",
            details: "Sem margem de lucro",
            value: totalCostWithoutProfit
          },
          {
            item: "Margem de Lucro",
            details: `${tonnage} toneladas × $${profitMargin.toFixed(2)}/ton`,
            value: profitAmount
          },
          {
            item: "Total",
            details: "Custo total incluindo margem",
            value: totalCost
          }
        ],
        totalCost,
        costPerTon,
        hasBalsa: aduanaInfo.has_balsa,
        balsaCost: aduanaInfo.has_balsa ? (
          aduanaInfo.balsa_cost || 
          aduanaInfo.balsa_puerto_indio || 0
        ) : undefined,
        originToAduanaPy: routeDistance.originToAduanaPy,
        aduanaBrToDestination: routeDistance.aduanaBrToDestination
      };
    })
  );
  
  // Find the aduana with the lowest total cost
  const sortedResults = [...aduanaResults].sort((a, b) => a.totalCost - b.totalCost);
  const bestResult = sortedResults[0];
  
  // Format aduana comparison
  const aduanaComparison: AduanaDetails[] = sortedResults.map(result => ({
    name: result.aduanaName,
    country: 'BR',
    partnerAduana: result.aduanaPY,
    distance: Math.round(result.distance),
    costPerTon: result.costPerTon,
    hasBalsa: result.hasBalsa,
    balsaCost: result.balsaCost,
    total: result.totalCost,
    isRecommended: result.aduanaName === bestResult.aduanaName
  }));
  
  // Return the final calculation result
  return {
    recommendedAduana: bestResult.aduanaName,
    totalCost: bestResult.totalCost,
    costPerTon: bestResult.costPerTon,
    totalDistance: bestResult.distance,
    requiredTrucks,
    exchangeRate: exchangeRates.USD_BRL,
    estimatedProfit: tonnage * profitMargin,
    costBreakdown: bestResult.costBreakdown,
    aduanaComparison,
    // Não restauramos mais os customsDetails para preservar a escolha do usuário
    customsDetails: {
      originLocation: origin,
      destinationLocation: destination,
      customsPoint: `${bestResult.aduanaName} / ${bestResult.aduanaPY}`
    }
  };
}

async function calculateAdunaCosts(
  aduanaName: string,  // Adicionamos o nome da aduana como parâmetro
  aduanaInfo: AduanaInfo,
  tonnage: number,
  trucks: number,
  driverPaymentBRL: number,
  merchandiseValueUSD: number,
  includeInsurance: boolean,
  specialHandling: boolean,
  customsProcess: string,
  exchangeRates: ExchangeRates,
  company_pays_balsa: boolean = false // Por padrão, a empresa NÃO paga a balsa
): Promise<CostItem[]> {
  // IMPORTANTE: SEMPRE OBTER DADOS FRESCOS DO BANCO DE DADOS
  // Não vamos mais usar dados passados como parâmetro ou legados
  let freshAduanaInfo: AduanaInfo | null = null;
  
  try {
    // Importação dinâmica para evitar dependências circulares
    const { getAduanaInfoFromCrossingPoint } = await import('./calculationUtils');
    freshAduanaInfo = await getAduanaInfoFromCrossingPoint(aduanaName);
    
    if (!freshAduanaInfo) {
      console.error(`[ERRO CRÍTICO] Não foi possível obter dados do banco para ${aduanaName}`);
      throw new Error(`Dados não encontrados para aduana ${aduanaName}`);
    }
    
    console.log(`[Aduana] Dados frescos obtidos do banco para ${aduanaName}:`, {
      nome: freshAduanaInfo.nome,
      faf_per_truck: freshAduanaInfo.faf_per_truck,
      faf_lot_1000: freshAduanaInfo.faf_lot_1000,
      faf_lot_1500: freshAduanaInfo.faf_lot_1500,
      has_fula: freshAduanaInfo.has_fula,
      has_balsa: freshAduanaInfo.has_balsa
    });
    
    // Sobrescreve os dados recebidos com os dados frescos do banco
    aduanaInfo = freshAduanaInfo;
  } catch (error) {
    console.error(`[ERRO CRÍTICO] Falha ao carregar dados do banco para ${aduanaName}:`, error);
    throw new Error(`Falha ao carregar dados para aduana ${aduanaName}`);
  }
  
  const costs: CostItem[] = [];
  
  // 1. Base freight cost (already calculated and passed in)
  
  // 2. FAF cost - SEMPRE USANDO DADOS FRESCOS DO BANCO
  console.log(`[FAF] Tipo da informação: ${typeof aduanaInfo.faf_per_truck}, Valor: ${aduanaInfo.faf_per_truck}`);
  
  // Usar a função do calculationUtils para obter o valor FAF atualizado
  try {
    // DEPURAÇÃO ADICIONADA: Exibir os dados do crossing point diretamente do banco para conferência
    console.log(`[FAF DEBUG] Buscando dados MAIS ATUAIS do banco antes de calcular...`);
    
    // Buscar direto do banco sem intermediários
    const response = await apiRequest('GET', '/api/crossing-points');
    const allPoints = await response.json();
    
    // Encontrar o ponto correspondente à aduana brasileira
    const crossingPoint = allPoints.find(
      (point: any) => point.brazilianSide.name === aduanaName
    );
    
    if (crossingPoint) {
      console.log(`[FAF DEBUG] DADOS BRUTOS DO BANCO PARA ${aduanaName}:`, {
        perTruck_RAW: crossingPoint.faf.perTruck,
        lot1000_RAW: crossingPoint.faf.lot1000,
        lot1500_RAW: crossingPoint.faf.lot1500,
      });
    }
    
    // Continuar com o fluxo normal
    const { getFAFValue } = await import('./calculationUtils');
    const fafCostGS = await getFAFValue(aduanaName, tonnage, trucks);
    
    console.log(`[FAF] Valor obtido diretamente do banco: ${fafCostGS} GS para aduana ${aduanaName}, tonelagem ${tonnage}`);
    
    // Convert FAF from GS to USD (aproximadamente 1 USD = 7500 GS)
    const fafCostUSD = convertCurrency(fafCostGS, 'GS', 'USD', exchangeRates) || 0;
    
    // Log para acompanhamento sem verificação de valor específico
    console.log(`[FAF INFO] Valor atual para ${aduanaName}: ${fafCostGS} GS`);
    
    costs.push({
      item: "FAF",
      details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × ${fafCostGS.toLocaleString('pt-BR')} GS`,
      value: fafCostUSD
    });
  } catch (error) {
    console.error(`[ERRO CRÍTICO] Falha ao calcular FAF para ${aduanaName}:`, error);
    throw new Error(`Falha ao calcular FAF para aduana ${aduanaName}`);
  }
  
  // 3. FULA cost if applicable
  if (aduanaInfo.has_fula && aduanaInfo.fula_cost) {
    const fulaCostUSD = tonnage * aduanaInfo.fula_cost;
    costs.push({
      item: "FULA",
      details: `${tonnage} toneladas × ${aduanaInfo.fula_cost.toFixed(2)} USD/ton`,
      value: fulaCostUSD
    });
  }
  
  // 4. MAPA/Ministry cost if applicable
  if (aduanaInfo.mapa_cost) {
    const mapaCostUSD = tonnage * aduanaInfo.mapa_cost;
    costs.push({
      item: "Mapa/Ministério",
      details: `${tonnage} toneladas × ${aduanaInfo.mapa_cost.toFixed(2)} USD/ton`,
      value: mapaCostUSD
    });
  } else if (aduanaInfo.mapa_acerto && aduanaInfo.mapa_fixo) {
    const mapaAcertoUSD = tonnage * aduanaInfo.mapa_acerto;
    const mapaFixoUSD = tonnage * aduanaInfo.mapa_fixo;
    costs.push({
      item: "Mapa/Ministério (Acerto)",
      details: `${tonnage} toneladas × ${aduanaInfo.mapa_acerto.toFixed(2)} USD/ton`,
      value: mapaAcertoUSD
    });
    costs.push({
      item: "Mapa/Ministério (Fixo)",
      details: `${tonnage} toneladas × ${aduanaInfo.mapa_fixo.toFixed(2)} USD/ton`,
      value: mapaFixoUSD
    });
  } else if (aduanaInfo.mapa_cost_1000 || aduanaInfo.mapa_cost_1500) {
    let mapaCostBRL = 0;
    if (tonnage <= 1000 && aduanaInfo.mapa_cost_1000) {
      mapaCostBRL = aduanaInfo.mapa_cost_1000;
    } else if (aduanaInfo.mapa_cost_1500) {
      mapaCostBRL = aduanaInfo.mapa_cost_1500;
    }
    
    const mapaCostUSD = convertCurrency(mapaCostBRL, 'BRL', 'USD', exchangeRates) || 0;
    costs.push({
      item: "Mapa/Ministério",
      details: `Taxa fixa: R$ ${mapaCostBRL.toFixed(2)}`,
      value: mapaCostUSD
    });
  }
  
  // 5. Balsa (Ferry) cost if applicable
  console.log(`Calculando custos de balsa para ${aduanaInfo.nome}:`, {
    temBalsa: aduanaInfo.has_balsa,
    empresaPagaBalsa: company_pays_balsa,
    balsa_cost: aduanaInfo.balsa_cost
  });
  
  // Caso especial: Santa Helena (aduana com balsa) sempre tem balsa paga pela empresa
  const isSantaHelena = aduanaInfo.nome && aduanaInfo.nome.toLowerCase().includes('santa helena');
  // Guaíra depende da escolha do usuário no checkbox "Empresa paga balsa"
  const isGuaira = aduanaInfo.nome && aduanaInfo.nome.toLowerCase().includes('guaíra');
  
  // Decide se a empresa paga balsa com base na aduana:
  // - Para Santa Helena: sempre paga (independente da configuração)
  // - Para Guaíra: depende da configuração do checkbox
  // - Para outras aduanas: sem balsa ou segue a configuração padrão
  const shouldCompanyPayBalsa = isSantaHelena || (isGuaira && company_pays_balsa);
  
  if (aduanaInfo.has_balsa && shouldCompanyPayBalsa) {
    // Se tem balsa_cost, é uma balsa padrão
    if (aduanaInfo.balsa_cost) {
      const balsaCostBRL = trucks * aduanaInfo.balsa_cost;
      const balsaCostUSD = convertCurrency(balsaCostBRL, 'BRL', 'USD', exchangeRates) || 0;
      
      costs.push({
        item: "Balsa",
        details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${(aduanaInfo.balsa_cost || 0).toFixed(2)}`,
        value: balsaCostUSD
      });
    } 
    // Se tem balsa_puerto_indio, é opção de Puerto Indio (Santa Helena)
    else if (aduanaInfo.balsa_puerto_indio) {
      const balsaPuertoCostBRL = trucks * aduanaInfo.balsa_puerto_indio;
      const balsaPuertoCostUSD = convertCurrency(balsaPuertoCostBRL, 'BRL', 'USD', exchangeRates) || 0;
      
      costs.push({
        item: "Balsa (Puerto Indio)",
        details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${(aduanaInfo.balsa_puerto_indio || 0).toFixed(2)}`,
        value: balsaPuertoCostUSD
      });
    }
    
    // Removemos a opção de balsa Sanga Funda conforme solicitado pelo cliente
    // Para Santa Helena, usamos exclusivamente a opção Puerto Indio
  } else if (aduanaInfo.has_balsa && isGuaira && !company_pays_balsa) {
    // Se o motorista paga a balsa em Guaíra, adicionamos um item informativo com valor zero
    costs.push({
      item: "Balsa",
      details: "Motorista paga (não incluso no custo)",
      value: 0
    });
  }
  
  // 6. Parking cost if applicable
  if (aduanaInfo.has_estacionamento && aduanaInfo.estacionamento_cost) {
    const parkingCostBRL = trucks * aduanaInfo.estacionamento_cost;
    const parkingCostUSD = convertCurrency(parkingCostBRL, 'BRL', 'USD', exchangeRates) || 0;
    
    costs.push({
      item: "Estacionamento",
      details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${aduanaInfo.estacionamento_cost.toFixed(2)}`,
      value: parkingCostUSD
    });
  }
  
  // 7. Dinatran cost if applicable
  if (aduanaInfo.dinatran_cost) {
    const dinatranCostBRL = trucks * aduanaInfo.dinatran_cost;
    const dinatranCostUSD = convertCurrency(dinatranCostBRL, 'BRL', 'USD', exchangeRates) || 0;
    
    costs.push({
      item: "Dinatran",
      details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${aduanaInfo.dinatran_cost.toFixed(2)}`,
      value: dinatranCostUSD
    });
  }
  
  // 8. Luiz Baciquet commission if applicable
  if (aduanaInfo.has_comissao_luiz && aduanaInfo.comissao_luiz) {
    const commissionBRL = tonnage * aduanaInfo.comissao_luiz;
    const commissionUSD = convertCurrency(commissionBRL, 'BRL', 'USD', exchangeRates) || 0;
    
    costs.push({
      item: "Comissão Luiz Baciquet",
      details: `${tonnage} toneladas × R$ ${aduanaInfo.comissao_luiz.toFixed(2)}/ton`,
      value: commissionUSD
    });
  }
  
  // 9. Driver payment
  const driverTotalBRL = tonnage * driverPaymentBRL;
  const driverTotalUSD = convertCurrency(driverTotalBRL, 'BRL', 'USD', exchangeRates) || 0;
  
  costs.push({
    item: "Pagamento Motorista",
    details: `${tonnage} toneladas × R$ ${driverPaymentBRL.toFixed(2)}/ton`,
    value: driverTotalUSD
  });
  
  // 10. Insurance if enabled
  if (includeInsurance && merchandiseValueUSD > 0) {
    const insuranceCostUSD = calculateInsuranceCost(merchandiseValueUSD);
    
    costs.push({
      item: "Seguro",
      details: `$${merchandiseValueUSD.toFixed(2)} × 0.14%`,
      value: insuranceCostUSD
    });
  }
  
  // 11. Special handling if enabled
  if (specialHandling) {
    const specialHandlingCostUSD = tonnage * 0.8; // $0.80 per ton for special handling
    
    costs.push({
      item: "Manuseio Especial",
      details: `${tonnage} toneladas × $0.80/ton`,
      value: specialHandlingCostUSD
    });
  }
  
  // 12. Customs process adjustment
  if (customsProcess !== 'normal') {
    // Calculate the sum of all costs so far
    const subtotal = costs.reduce((sum, item) => sum + item.value, 0);
    
    if (customsProcess === 'expedited') {
      // 15% surcharge for expedited process
      const expeditedCostUSD = subtotal * 0.15;
      
      costs.push({
        item: "Processo Acelerado",
        details: `Taxa adicional de 15% (3-5 dias)`,
        value: expeditedCostUSD
      });
    } else if (customsProcess === 'priority') {
      // 30% surcharge for priority process
      const priorityCostUSD = subtotal * 0.3;
      
      costs.push({
        item: "Processo Prioritário",
        details: `Taxa adicional de 30% (1-2 dias)`,
        value: priorityCostUSD
      });
    }
  }
  
  return costs;
}
