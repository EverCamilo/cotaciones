import { Request, Response } from 'express';
import { getExchangeRates } from '../handlers/exchangeRatesHandler';
import { AduanaInfo, calculateTrucks, calculateInsuranceCost, calculateFreightBase } from '../../client/src/utils/aduanaHelper';
import { getAllCrossingPoints } from '../../client/src/utils/crossingPointHelper';

// Lista fixa de aduanas disponíveis para garantir funcionamento mesmo quando ADUANA_INFO estiver vazio
const ADUANAS_DISPONIVEIS = ["Guaíra", "Mundo Novo", "Foz do Iguaçu", "Santa Helena"];
import { calculateDistanceInternal, DistanceCalculationParams } from './distanceHandler';

// Define exchange rates interface
interface ExchangeRates {
  USD_BRL: number;
  USD_GS: number;
}

// Define freight quote interface
interface FreightQuote {
  origin: string;
  originPlaceId?: string;  // Google Place ID for origin
  originLat?: string;      // Latitude da origem
  originLng?: string;      // Longitude da origem
  destination: string;
  destinationPlaceId?: string;  // Google Place ID for destination
  destinationLat?: string; // Latitude do destino
  destinationLng?: string; // Longitude do destino
  productType: string;
  specificProduct?: string;
  productPrice?: number;
  tonnage: number;
  driverPayment: number;
  profitMargin: number;
  merchandiseValue: number;
  
  // Flags especiais para garantir que as preferências do usuário sejam respeitadas
  _forceAduana?: boolean; // Flag para forçar o uso da aduana selecionada
  _selectedAduana?: string; // Aduana escolhida explicitamente pelo usuário
  _forceBalsaPayment?: boolean; // Flag para forçar o pagamento da balsa pela empresa
  
  customsDetails?: {
    preferredAduana?: string;
    includeInsurance?: boolean;
    specialHandling?: boolean;
    customsProcess?: string;
    companyPaysBalsa?: boolean;
    additionalNotes?: string;
  };
}

// Define cost item interface
interface CostItem {
  item: string;
  details: string;
  value: number;
  isReferenceOnly?: boolean; // Indica que esse item é apenas para cálculo interno, não compõe o custo final real
}

// Define aduana details interface
interface AduanaDetails {
  name: string;
  country: string;
  partnerAduana: string;
  distance?: number;
  costPerTon?: number;
  hasBalsa: boolean;
  balsaCost?: number | Record<string, number>;
  total?: number;
  isRecommended?: boolean;
}

// Export funções necessárias para o handler de recomendação de aduana
export { calculateFreightBase, calculateTrucks, calculateAdunaCosts };

export async function calculateFreight(req: Request, res: Response) {
  try {
    const quoteData: FreightQuote = req.body;
    
    // Imprimir os dados recebidos para debug
    console.log("💼 Requisição de cálculo recebida:", JSON.stringify({
      origin: quoteData.origin,
      destination: quoteData.destination,
      tonnage: quoteData.tonnage,
      customsDetails: quoteData.customsDetails
    }, null, 2));
    
    // Validate required fields
    if (!quoteData.origin || !quoteData.destination || !quoteData.tonnage || 
        quoteData.tonnage <= 0 || !quoteData.productType) {
      return res.status(400).json({ 
        message: 'Dados incompletos. Verifique todos os campos obrigatórios.' 
      });
    }
    
    // Get current exchange rates
    const exchangeRates: ExchangeRates = await fetchExchangeRates();
    
    // Calculate freight costs
    const result = await performFreightCalculation(quoteData, exchangeRates);
    
    // Return the calculated results
    res.json(result);
  } catch (error) {
    console.error('Error calculating freight:', error);
    res.status(500).json({ 
      message: 'Erro ao calcular frete', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    // Use the existing exchange rates handler
    const ratesRes: any = {};
    await getExchangeRates({ } as Request, { 
      json: (data: any) => { Object.assign(ratesRes, data); }
    } as unknown as Response);
    
    return {
      USD_BRL: ratesRes.usdToBrl,
      USD_GS: ratesRes.usdToGs
    };
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return default rates if there's an error
    return {
      USD_BRL: 5.40,
      USD_GS: 7500.0
    };
  }
}

async function performFreightCalculation(
  quoteData: FreightQuote,
  exchangeRates: ExchangeRates
) {
  const { 
    origin, 
    originPlaceId,
    destination, 
    destinationPlaceId,
    tonnage, 
    driverPayment, 
    profitMargin, 
    merchandiseValue, 
    customsDetails, 
    productType 
  } = quoteData;
  
  // Log para depuração - verificar detalhes da cotação recebida
  console.log("Dados da cotação recebidos:", JSON.stringify({
    origin,
    destination,
    tonnage,
    customsDetails
  }, null, 2));

  // SOLUÇÃO DEFINITIVA: Verificar flags especiais para GARANTIR que a escolha do usuário seja respeitada
  console.log("-------------- INICIALIZANDO CÁLCULO DE FRETE --------------");
  console.log("Dados recebidos do cliente:", JSON.stringify({
    origem: origin,
    destino: destination,
    customsDetails,
    forceAduana: quoteData._forceAduana,
    selectedAduana: quoteData._selectedAduana,
    forceBalsaPayment: quoteData._forceBalsaPayment,
  }, null, 2));
  
  // Verificação CRÍTICA para garantir respeito à decisão do usuário
  let aduanasToCalculate: string[] = [];
  
  // SOLUÇÃO DEFINITIVA E VERIFICADA:
  // Nos lados cliente e servidor, verificamos TODAS as possíveis fontes de informação
  
  // CASO 1: Flag especial de força está ativa - SEMPRE use a aduana selecionada
  if (quoteData._forceAduana === true && quoteData._selectedAduana) {
    console.log(`🚨🚨🚨 FLAG DE FORÇA ATIVADA - Usuário EXIGE a aduana: ${quoteData._selectedAduana}`);
    console.log(`🚨🚨🚨 Nenhuma outra aduana será calculada ou considerada!`);
    console.log(`🚨🚨🚨 Aduana escolhida pelo usuário está sendo FORÇADA`);
    
    // IMPORTANTE: Verificar se a aduana existe na lista fixa
    if (!ADUANAS_DISPONIVEIS.includes(quoteData._selectedAduana)) {
      console.error(`ERRO CRÍTICO: Aduana '${quoteData._selectedAduana}' não encontrada no sistema!`);
      throw new Error(`Aduana '${quoteData._selectedAduana}' não encontrada. Por favor, selecione uma aduana válida.`);
    }
    
    aduanasToCalculate = [quoteData._selectedAduana];
    
    // Garantir consistência no customsDetails também
    if (customsDetails && customsDetails.preferredAduana !== quoteData._selectedAduana) {
      console.log(`Corrigindo inconsistência: customsDetails.preferredAduana = ${quoteData._selectedAduana}`);
      customsDetails.preferredAduana = quoteData._selectedAduana;
    }
  }
  // CASO 2: Aduana preferencial específica nos customsDetails (não auto)
  else if (customsDetails?.preferredAduana && customsDetails.preferredAduana !== 'auto') {
    console.log(`✅ Aduana preferencial explicitamente selecionada pelo usuário: ${customsDetails.preferredAduana}`);
    console.log(`✅ Apenas esta aduana será utilizada nos cálculos`);
    
    // IMPORTANTE: Verificar se a aduana existe na lista fixa
    if (!ADUANAS_DISPONIVEIS.includes(customsDetails.preferredAduana)) {
      console.error(`ERRO CRÍTICO: Aduana '${customsDetails.preferredAduana}' não encontrada no sistema!`);
      throw new Error(`Aduana '${customsDetails.preferredAduana}' não encontrada. Por favor, selecione uma aduana válida.`);
    }
    
    aduanasToCalculate = [customsDetails.preferredAduana];
  } 
  // CASO 3: Modo automático - calcular todas
  else {
    console.log("ℹ️ Modo automático solicitado - calculando para todas as aduanas");
    
    // IMPORTANTE: Como ADUANA_INFO agora está vazio, usamos a lista fixa
    aduanasToCalculate = ADUANAS_DISPONIVEIS;
    
    // Tentativa de obter do banco em tempo real
    try {
      console.log("📊 Tentando obter lista de aduanas do banco de dados...");
      const crossingPoints = await getAllCrossingPoints();
      
      if (crossingPoints && crossingPoints.length > 0) {
        const aduanasFromDB = crossingPoints.map(point => point.brazilianSide.name);
        console.log(`📊 Obtidas ${aduanasFromDB.length} aduanas do banco:`, aduanasFromDB);
        
        // Se conseguirmos obter do banco, usamos essa lista
        if (aduanasFromDB.length > 0) {
          aduanasToCalculate = aduanasFromDB;
        }
      }
    } catch (error) {
      console.error("❌ Erro ao obter aduanas do banco. Usando lista fixa:", error);
    }
    
    console.log("📋 Lista final de aduanas para cálculo:", aduanasToCalculate);
  }
  
  console.log("ADUANAS QUE SERÃO CALCULADAS:", aduanasToCalculate);
  console.log("------------------------------------------------------------");

  // Calculate required trucks
  const requiredTrucks = calculateTrucks(tonnage);
  
  // CORREÇÃO CRÍTICA: Verificar explicitamente se o usuário selecionou uma aduana específica
  // Esta verificação é crucial para garantir que respeitemos a escolha do usuário
  console.log(`🚨 VERIFICAÇÃO DECISIVA: ${customsDetails?.preferredAduana || 'NENHUMA ADUANA ESPECÍFICA'}`);
  if (customsDetails?.preferredAduana && customsDetails.preferredAduana !== 'auto') {
    console.log(`🔴 ATENÇÃO! Usuário explicitamente escolheu a aduana: ${customsDetails.preferredAduana}`);
    console.log(`🔴 Esta escolha DEVE ser respeitada! Não calcularemos outra aduana.`);
    
    // GARANTIR que apenas a aduana selecionada pelo usuário seja calculada
    aduanasToCalculate = [customsDetails.preferredAduana];
  }
  
  // Calculate for each possible aduana (a esta altura deve ser apenas uma se o usuário selecionou uma específica)
  console.log(`Aduanas que serão efetivamente calculadas: ${aduanasToCalculate.join(', ')}`);
  
  const aduanaResults = await Promise.all(
    aduanasToCalculate.map(async (aduanaName) => {
      console.log(`Calculando custos para aduana: ${aduanaName}`);
      
      // Se esta é a aduana selecionada pelo usuário, marcar com destaque nos logs
      if (customsDetails?.preferredAduana === aduanaName) {
        console.log(`✅✅✅ ADUANA EXPLICITAMENTE SELECIONADA PELO USUÁRIO: ${aduanaName}`);
      }
      
      // Chamamos o cálculo de distância usando a função interna
      let distanceRes: any = {};

      try {
        // Criamos um objeto com os parâmetros para a função interna
        const params: DistanceCalculationParams = {
          origin, 
          destination, 
          aduanaBr: aduanaName,
          origin_place_id: originPlaceId, 
          destination_place_id: destinationPlaceId,
          // Adicionamos suporte para coordenadas se necessário
          origin_lat: quoteData.originLat,
          origin_lng: quoteData.originLng,
          destination_lat: quoteData.destinationLat,
          destination_lng: quoteData.destinationLng
        };

        // Chamamos a função interna diretamente
        distanceRes = await calculateDistanceInternal(params);
        console.log(`Distância calculada para ${aduanaName}: ${distanceRes.totalDistance} km`);
      } catch (error) {
        console.warn(`Erro ao calcular distância para ${aduanaName}:`, error);
        // Em caso de erro, retornamos um objeto vazio com distância zero
        distanceRes = { totalDistance: 0, originToAduanaPy: 0, aduanaBrToDestination: 0 };
      }
      
      const routeDistance = {
        totalDistance: distanceRes.totalDistance || 0,
        originToAduanaPy: distanceRes.originToAduanaPy || 0,
        aduanaBrToDestination: distanceRes.aduanaBrToDestination || 0
      };
      // Buscar as informações da aduana do banco de dados em tempo real
      // Não usamos mais valores padrão, dependemos exclusivamente do banco de dados
      let aduanaInfo: AduanaInfo = {
        nome: aduanaName,
        faf_per_truck: 0, // Será substituído pelos valores reais do banco
        faf_lot_1000: 0,  // Será substituído pelos valores reais do banco
        faf_lot_1500: 0,  // Será substituído pelos valores reais do banco
        has_fula: false,
        has_balsa: false,
        has_estacionamento: false,
        has_comissao_luiz: false
      };
      
      // Tentativa de obter dados frescos do banco
      try {
        console.log(`📊 Buscando dados da aduana ${aduanaName} diretamente do banco...`);
        
        // Ao invés de usar métodos do cliente, vamos fazer a consulta diretamente ao banco Firebase
        // Isso evita problemas de URL no ambiente do servidor
        const { adminDb } = (await import('../firebase'));

        // Verificamos se adminDb está disponível com os métodos corretos
        if (!adminDb || typeof adminDb.collection !== 'function') {
          console.error('❌ Erro crítico: adminDb não está disponível ou não tem o método collection');
          throw new Error(`Firebase Admin não está corretamente inicializado. Verifique as configurações.`);
        }
        
        // Usamos o Firebase Admin para acessar o banco de dados
        const crossingPointsRef = adminDb.collection('crossing_points');
        const querySnapshot = await crossingPointsRef.where('brazilianSide.name', '==', aduanaName).get();
        
        if (querySnapshot.empty) {
          console.log(`⚠️ Nenhum ponto de travessia encontrado para ${aduanaName} no Firebase`);
          throw new Error(`Ponto de travessia para ${aduanaName} não encontrado no banco de dados`);
        }
        
        // Converter snapshot para objeto
        const doc = querySnapshot.docs[0];
        const crossingPoint = {
          id: doc.id,
          ...doc.data()
        };
        
        console.log(`✅ Ponto de travessia obtido DIRETAMENTE do Firebase para ${aduanaName}`);
        
        // Função parseNumericValue local para não depender da importação do cliente
        const parseNumericValue = (value: any): number => {
          if (!value) return 0;
          const cleanedValue = String(value).replace(/[^\d.-]/g, '');
          return parseFloat(cleanedValue) || 0;
        };
        
        // Se conseguimos obter o ponto de travessia, convertemos para o formato AduanaInfo
        let freshAduanaInfo = null;
        if (crossingPoint) {
          console.log(`✅ Ponto de travessia obtido do banco para ${aduanaName}`);
          
          freshAduanaInfo = {
            nome: crossingPoint.brazilianSide.name,
            faf_per_truck: parseNumericValue(crossingPoint.faf.perTruck),
            faf_lot_1000: parseNumericValue(crossingPoint.faf.lot1000),
            faf_lot_1500: parseNumericValue(crossingPoint.faf.lot1500),
            has_fula: crossingPoint.fula.enabled,
            fula_cost: crossingPoint.fula.costPerTon ? parseNumericValue(crossingPoint.fula.costPerTon) : undefined,
            mapa_cost: crossingPoint.mapa.costPerTon ? parseNumericValue(crossingPoint.mapa.costPerTon) : undefined,
            mapa_acerto: crossingPoint.mapa.acerto ? parseNumericValue(crossingPoint.mapa.acerto) : undefined,
            mapa_fixo: crossingPoint.mapa.fixo ? parseNumericValue(crossingPoint.mapa.fixo) : undefined,
            mapa_cost_1000: crossingPoint.mapa.lot1000 ? parseNumericValue(crossingPoint.mapa.lot1000) : undefined,
            mapa_cost_1500: crossingPoint.mapa.lot1500 ? parseNumericValue(crossingPoint.mapa.lot1500) : undefined,
            has_balsa: crossingPoint.balsa.enabled,
            balsa_cost: crossingPoint.balsa.defaultCost || undefined,
            balsa_puerto_indio: crossingPoint.balsa.puertoIndioCost || undefined,
            has_estacionamento: crossingPoint.estacionamento.enabled,
            estacionamento_cost: crossingPoint.estacionamento.enabled ? parseNumericValue(crossingPoint.estacionamento.costPerTruck) : undefined,
            dinatran_cost: crossingPoint.dinatran.enabled ? parseNumericValue(crossingPoint.dinatran.costPerTruck) : undefined,
            has_comissao_luiz: crossingPoint.comissaoLuiz.enabled,
            comissao_luiz: crossingPoint.comissaoLuiz.enabled ? parseNumericValue(crossingPoint.comissaoLuiz.costPerTon) : undefined
          };
          
          // Log extra para verificar os valores de balsa
          console.log(`🚢 Valores de balsa para ${aduanaName}:`, {
            enabled: crossingPoint.balsa.enabled,
            defaultCost: crossingPoint.balsa.defaultCost,
            puertoIndioCost: crossingPoint.balsa.puertoIndioCost
          });
        }
        
        if (freshAduanaInfo) {
          console.log(`✅ Dados obtidos com sucesso do banco para ${aduanaName}`);
          aduanaInfo = freshAduanaInfo;
          
          // Log detalhado para depuração dos valores FAF
          console.log(`FAF values para ${aduanaName} do banco:`, {
            perTruck: aduanaInfo.faf_per_truck,
            lot1000: aduanaInfo.faf_lot_1000,
            lot1500: aduanaInfo.faf_lot_1500
          });
        } else {
          console.error(`🚨 ERRO CRÍTICO: Não foi possível obter dados do banco para ${aduanaName}`);
          throw new Error(`Não foi possível obter configurações da aduana ${aduanaName} do banco de dados. Verifique se ela existe no sistema.`);
        }
      } catch (error: any) {
        console.error(`❌ Erro ao buscar dados da aduana ${aduanaName} do banco:`, error);
        throw new Error(`Erro crítico: Não foi possível obter dados da aduana ${aduanaName} do banco: ${error?.message || 'Erro desconhecido'}`);
      }
      
      // Calculate base freight cost - APENAS referência para determinar a melhor aduana!
      // Não faz parte do custo final apresentado ao cliente
      const freightBaseCost = calculateFreightBase(routeDistance.totalDistance, tonnage);
      
      const freightBaseItem: CostItem = {
        item: "Frete Base (Referência)",
        details: `(${Math.round(routeDistance.totalDistance)} km ÷ 25) × ${tonnage} toneladas - *APENAS PARA CÁLCULO INTERNO*`,
        value: freightBaseCost,
        isReferenceOnly: true // Marca este item como apenas referência
      };
      
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
      // Capturamos o valor exato da configuração do usuário
      const companyPaysBalsa = customsDetails?.companyPaysBalsa === true;
      
      console.log(`IMPORTANTE: Configuração de pagamento da balsa definida pelo usuário: ${companyPaysBalsa ? 'SIM' : 'NÃO'}`);
      console.log('Detalhes completos recebidos:', JSON.stringify(customsDetails, null, 2));

      // CORREÇÃO CRÍTICA: VERIFICAR FLAGS ESPECIAIS para o pagamento da balsa
      // Santa Helena é um caso especial - a empresa sempre paga a balsa
      // Guaíra depende da escolha do usuário no checkbox "Empresa paga balsa"
      const isSantaHelena = aduanaName === 'Santa Helena';
      const isGuaira = aduanaName === 'Guaíra';
      
      // CORREÇÃO: Primeiramente verificar se o usuário EXIGIU que a empresa pague a balsa
      let shouldCompanyPayBalsa = false;
      
      if (quoteData._forceBalsaPayment === true) {
        // Flag especial ativa: FORÇAR o pagamento da balsa pela empresa
        console.log(`🚨🚨🚨 FLAG DE FORÇA ATIVADA - Usuário EXIGE que a empresa pague a balsa!`);
        shouldCompanyPayBalsa = true;
      } else if (isSantaHelena) {
        // Para Santa Helena: sempre paga (independente da configuração)
        shouldCompanyPayBalsa = true;
      } else if (isGuaira && companyPaysBalsa) {
        // Para Guaíra: depende da configuração do checkbox
        shouldCompanyPayBalsa = true;
      }
      
      console.log(`Decisão sobre pagamento de balsa para ${aduanaName}:
        - É Santa Helena? ${isSantaHelena ? 'Sim' : 'Não'}
        - É Guaíra? ${isGuaira ? 'Sim' : 'Não'}
        - Configuração original: ${companyPaysBalsa ? 'Empresa paga' : 'Motorista paga'}
        - Flag de força ativada: ${quoteData._forceBalsaPayment ? 'SIM' : 'Não'}
        - Decisão final: ${shouldCompanyPayBalsa ? 'EMPRESA PAGA A BALSA' : 'Motorista paga a balsa'}
      `);
      
      console.log(`Calculando custos para aduana ${aduanaName}, empresa paga balsa: ${shouldCompanyPayBalsa}, 
                  configuração do usuário: ${customsDetails?.companyPaysBalsa}, 
                  é Santa Helena: ${isSantaHelena}`);
                  
      const costs = calculateAdunaCosts(
        aduanaInfo,
        tonnage,
        requiredTrucks,
        driverPayment,
        merchandiseValue,
        customsDetails?.includeInsurance ?? true,
        customsDetails?.specialHandling ?? false,
        customsDetails?.customsProcess ?? 'normal',
        exchangeRates,
        shouldCompanyPayBalsa // Agora passamos o valor correto com base nas regras de negócio
      );
      
      // Add base freight cost to the beginning
      costs.unshift(freightBaseItem);
      
      // Sum all costs, EXCLUINDO os itens marcados como apenas referência
      const totalCostWithoutProfit = costs.reduce((sum, item) => {
        // Se o item for apenas referência (como o frete base), não soma ao custo total real
        if (item.isReferenceOnly) return sum;
        return sum + item.value;
      }, 0);
      
      // Add profit margin
      const profitAmount = tonnage * profitMargin;
      
      // Calculate total with profit
      const totalCost = totalCostWithoutProfit + profitAmount;
      
      // Para comparação de aduana usamos o frete base + custos aduaneiros
      // Este é o valor que será usado para ordenar e recomendar a melhor aduana
      const freightBaseValue = costs.find(c => c.isReferenceOnly)?.value || 0;
      const totalForComparison = totalCost + freightBaseValue;
      
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
        totalForComparison, // Adicionamos essa propriedade para comparação entre aduanas
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
  
  // CORREÇÃO CRÍTICA: Se o usuário selecionou uma aduana específica, ESSA aduana deve ser usada 
  // independente de qualquer cálculo de custo
  let bestResult;
  
  // Garantimos que a preferência do usuário seja SEMPRE respeitada
  if (customsDetails?.preferredAduana && customsDetails.preferredAduana !== 'auto') {
    console.log(`★★★ ATENÇÂO: Usuário escolheu explicitamente a aduana ${customsDetails.preferredAduana} ★★★`);
    
    // Como já filtramos os cálculos para incluir apenas a aduana selecionada,
    // devemos ter apenas um resultado aqui
    if (aduanaResults.length === 1) {
      bestResult = aduanaResults[0];
      console.log(`Usando a única aduana calculada: ${bestResult.aduanaName} (escolha do usuário)`);
    } else {
      // Caso inesperado: temos múltiplos resultados apesar do filtro
      bestResult = aduanaResults.find(result => result.aduanaName === customsDetails.preferredAduana);
      
      if (!bestResult && aduanaResults.length > 0) {
        console.error(`Erro crítico: Aduana selecionada ${customsDetails.preferredAduana} não encontrada nos resultados calculados.`);
        // Em caso de erro, usamos o primeiro resultado disponível
        bestResult = aduanaResults[0];
        console.error(`Usando ${bestResult.aduanaName} como alternativa.`);
      } else if (!bestResult) {
        throw new Error(`Não foi possível calcular custos para a aduana selecionada: ${customsDetails.preferredAduana}`);
      } else {
        console.log(`Encontrada a aduana selecionada pelo usuário: ${bestResult.aduanaName}`);
      }
    }
  } else {
    // Modo automático - encontramos a aduana com menor custo total
    const sortedResults = [...aduanaResults].sort((a, b) => a.totalForComparison - b.totalForComparison);
    bestResult = sortedResults[0];
    console.log(`Modo automático: escolhida aduana ${bestResult.aduanaName} por ter o menor custo`);
  }
  
  // Ordenamos todos os resultados para a tabela de comparação
  const sortedResults = [...aduanaResults].sort((a, b) => a.totalForComparison - b.totalForComparison);
  
  // Format aduana comparison
  const aduanaComparison: AduanaDetails[] = sortedResults.map(result => {
    const costPerTonWithFreight = result.totalForComparison / tonnage;
    return {
      name: result.aduanaName,
      country: 'BR',
      partnerAduana: result.aduanaPY, 
      distance: Math.round(result.distance),
      costPerTon: result.costPerTon,
      costPerTonWithFreight: costPerTonWithFreight, // Custo por tonelada COM o frete base (para comparação)
      hasBalsa: result.hasBalsa,
      balsaCost: result.balsaCost,
      total: result.totalCost,
      totalWithFreight: result.totalForComparison, // Total incluindo o frete base
      isRecommended: result.aduanaName === bestResult.aduanaName
    };
  });
  
  // SOLUÇÃO DEFINITIVA: Garantir que a recomendação de aduana reflita a escolha do usuário
  
  // Se FORCEADUANA está ativo, a aduana recomendada DEVE ser a selecionada pelo usuário
  const recommendedAduanaName = quoteData._forceAduana && quoteData._selectedAduana 
      ? quoteData._selectedAduana 
      : (customsDetails?.preferredAduana && customsDetails.preferredAduana !== 'auto') 
      ? customsDetails.preferredAduana
      : bestResult.aduanaName;
      
  // Verificação de consistência final antes de retornar
  if ((quoteData._forceAduana && quoteData._selectedAduana) || 
      (customsDetails?.preferredAduana && customsDetails.preferredAduana !== 'auto')) {
      console.log(`🚨🚨🚨 VERIFICAÇÃO FINAL: A aduana retornada como recomendada DEVE ser: ${recommendedAduanaName}`);
      
      if (recommendedAduanaName !== bestResult.aduanaName) {
          console.log(`⚠️ CORREÇÃO FINAL: Alterando a aduana recomendada de ${bestResult.aduanaName} para ${recommendedAduanaName}`);
      }
  }
  
  // Return the final calculation result - agora com a aduana do usuário como recomendada
  return {
    recommendedAduana: recommendedAduanaName,
    totalCost: bestResult.totalCost,
    costPerTon: bestResult.costPerTon,
    totalDistance: bestResult.distance,
    requiredTrucks,
    exchangeRate: exchangeRates.USD_BRL,
    estimatedProfit: tonnage * profitMargin,
    productType: productType,
    specificProduct: quoteData.specificProduct,
    productPrice: quoteData.productPrice,
    costBreakdown: bestResult.costBreakdown,
    aduanaComparison,
    // Adicionamos o custo base de frete como referência separada
    freightBaseInfo: {
      value: calculateFreightBase(bestResult.distance, tonnage),
      details: `Frete Base (${Math.round(bestResult.distance)} km ÷ 25) × ${tonnage} toneladas`,
      description: "APENAS PARA REFERÊNCIA - Não faz parte do custo real. Usado apenas para determinar a aduana recomendada."
    },
    actualFreightInput: {
      currencyCode: "BRL",
      description: "O usuário deve inserir o valor real do frete em Reais após a recomendação da aduana"
    },
    // Adicionamos os segmentos da rota para visualização correta das distâncias parciais
    routeSegments: {
      originToCustoms: bestResult.originToAduanaPy,
      customsToDestination: bestResult.aduanaBrToDestination,
      crossingDistance: 5 // Valor padrão para travessia entre aduanas (5km)
    },
    customsDetails: {
      // IMPORTANTE: Preservar TODAS as configurações originais do usuário
      ...customsDetails,
      // Preservar a aduana preferida do usuário, se existir
      preferredAduana: customsDetails?.preferredAduana || "auto",
      // E adicionamos apenas as informações calculadas, não as seleções do usuário
      originLocation: origin,
      destinationLocation: destination,
      customsPoint: `${bestResult.aduanaName} / ${bestResult.aduanaPY}`
    }
  };
}

function calculateAdunaCosts(
  aduanaInfo: AduanaInfo,
  tonnage: number,
  trucks: number,
  driverPaymentBRL: number,
  merchandiseValueUSD: number,
  includeInsurance: boolean,
  specialHandling: boolean,
  customsProcess: string,
  exchangeRates: ExchangeRates,
  company_pays_balsa: boolean = false  // Por padrão, a empresa NÃO paga a balsa
): CostItem[] {
  const costs: CostItem[] = [];
  
  // 2. FAF cost (Frete Adicional de Fomento)
  // O FAF tem duas partes: um valor por caminhão E um valor fixo por lote
  const perTruckGS = aduanaInfo.faf_per_truck;
  const perTruckTotalGS = trucks * perTruckGS;
  
  let lotValueGS = 0;
  if (tonnage <= 1000) {
    // For small loads, use lot_1000
    lotValueGS = aduanaInfo.faf_lot_1000;
  } else {
    // For large loads, use lot_1500
    lotValueGS = aduanaInfo.faf_lot_1500;
  }
  
  // O custo total do FAF é a soma das duas partes
  const fafCostGS = perTruckTotalGS + lotValueGS;
  const fafDetails = `${trucks} caminhão${trucks > 1 ? 's' : ''} × ${perTruckGS.toLocaleString('pt-BR')} GS + ${lotValueGS.toLocaleString('pt-BR')} GS = ${fafCostGS.toLocaleString('pt-BR')} GS`;
  
  // Convert FAF from GS to USD
  const fafCostUSD = convertCurrency(fafCostGS, 'GS', 'USD', exchangeRates);
  
  costs.push({
    item: "FAF",
    details: fafDetails,
    value: fafCostUSD
  });
  
  // 3. FULA cost if applicable
  if (aduanaInfo.has_fula && aduanaInfo.fula_cost) {
    const fulaCostUSD = tonnage * aduanaInfo.fula_cost;
    costs.push({
      item: "FULA",
      details: `${tonnage} toneladas × ${(aduanaInfo.fula_cost || 0).toFixed(2)} USD/ton`,
      value: fulaCostUSD
    });
  }
  
  // 4. MAPA/Ministry cost if applicable
  if (aduanaInfo.mapa_cost) {
    const mapaCostUSD = tonnage * aduanaInfo.mapa_cost;
    costs.push({
      item: "Mapa/Ministério",
      details: `${tonnage} toneladas × ${(aduanaInfo.mapa_cost || 0).toFixed(2)} USD/ton`,
      value: mapaCostUSD
    });
  } else if (aduanaInfo.mapa_acerto && aduanaInfo.mapa_fixo) {
    const mapaAcertoUSD = tonnage * aduanaInfo.mapa_acerto;
    const mapaFixoUSD = tonnage * aduanaInfo.mapa_fixo;
    costs.push({
      item: "Mapa/Ministério (Acerto)",
      details: `${tonnage} toneladas × ${(aduanaInfo.mapa_acerto || 0).toFixed(2)} USD/ton`,
      value: mapaAcertoUSD
    });
    costs.push({
      item: "Mapa/Ministério (Fixo)",
      details: `${tonnage} toneladas × ${(aduanaInfo.mapa_fixo || 0).toFixed(2)} USD/ton`,
      value: mapaFixoUSD
    });
  } else if (aduanaInfo.mapa_cost_1000 || aduanaInfo.mapa_cost_1500) {
    let mapaCostBRL = 0;
    let mapaDetails = "";
    
    if (tonnage <= 1000 && aduanaInfo.mapa_cost_1000) {
      mapaCostBRL = aduanaInfo.mapa_cost_1000;
      mapaDetails = `Taxa fixa para lotes até 1000 toneladas: R$ ${mapaCostBRL.toFixed(2)}`;
    } else if (aduanaInfo.mapa_cost_1500) {
      mapaCostBRL = aduanaInfo.mapa_cost_1500;
      mapaDetails = `Taxa fixa para lotes acima de 1000 toneladas: R$ ${mapaCostBRL.toFixed(2)}`;
    }
    
    const mapaCostUSD = convertCurrency(mapaCostBRL, 'BRL', 'USD', exchangeRates);
    costs.push({
      item: "Mapa/Ministério",
      details: mapaDetails,
      value: mapaCostUSD
    });
  }
  
  // 5. Balsa (Ferry) cost if applicable
  // Log para depuração
  console.log(`Calculando custos de balsa para ${aduanaInfo.nome}:`, {
    temBalsa: aduanaInfo.has_balsa,
    empresaPagaBalsa: company_pays_balsa,
    balsa_cost: aduanaInfo.balsa_cost
  });
  
  // ATENÇÃO: Este bloco foi modificado na função anterior, garantindo que a flag especial
  // de pagamento da balsa seja sempre respeitada, mas mantemos este código
  // aqui também por redundância.
  
  // Caso especial: Santa Helena (aduana com balsa) sempre tem balsa paga pela empresa
  const isSantaHelena = aduanaInfo.nome && aduanaInfo.nome.toLowerCase().includes('santa helena');
  // Guaíra depende da escolha do usuário no checkbox "Empresa paga balsa"
  const isGuaira = aduanaInfo.nome && aduanaInfo.nome.toLowerCase().includes('guaíra');
  
  // IMPORTANTE: Priorizar a configuração explícita do usuário
  // SEMPRE que o usuário especificar que a empresa paga a balsa, devemos respeitar
  const shouldCompanyPayBalsa = company_pays_balsa || isSantaHelena;
  
  console.log(`Decisão sobre pagamento de balsa para ${aduanaInfo.nome}:
    - É Santa Helena? ${isSantaHelena ? 'Sim' : 'Não'}
    - É Guaíra? ${isGuaira ? 'Sim' : 'Não'}
    - Configuração do usuário: ${company_pays_balsa ? 'EMPRESA PAGA A BALSA' : 'Motorista paga'}
    - Decisão final: ${shouldCompanyPayBalsa ? 'EMPRESA PAGA A BALSA' : 'Motorista paga a balsa'}
  `);
  
  if (aduanaInfo.has_balsa && shouldCompanyPayBalsa) {
    // Depuração dos valores de balsa
    console.log(`🚢 DEBUG BALSA: balsa_cost=${aduanaInfo.balsa_cost}, balsa_puerto_indio=${aduanaInfo.balsa_puerto_indio}, nome=${aduanaInfo.nome}`);
    
    let balsaCostBRL = 0;
    let balsaType = "Balsa";
    
    // Verificamos em ordem de prioridade
    
    // 1. Se é Santa Helena, verificar primeiro o custo específico de Puerto Indio
    if (aduanaInfo.nome === 'Santa Helena' && aduanaInfo.balsa_puerto_indio) {
      balsaCostBRL = aduanaInfo.balsa_puerto_indio;
      balsaType = "Balsa (Puerto Indio)";
      console.log(`🚢 Usando valor específico para Puerto Indio: ${balsaCostBRL} BRL`);
    } 
    // 2. Se tem valor padrão, usamos esse
    else if (aduanaInfo.balsa_cost) {
      balsaCostBRL = aduanaInfo.balsa_cost;
      console.log(`🚢 Usando valor padrão de balsa: ${balsaCostBRL} BRL`);
    } 
    // 3. Se não temos valores do banco, não calculamos esse item
    else {
      console.log(`🚢 ATENÇÃO: Não há valor de balsa no banco de dados para ${aduanaInfo.nome}. Esse custo não será incluído.`);
      // Como não temos valor de balsa, não adicionamos o item ao array de custos
      return [];
    }
    
    // Calculamos o custo por caminhão
    const balsaTotalBRL = trucks * balsaCostBRL;
    const balsaCostUSD = convertCurrency(balsaTotalBRL, 'BRL', 'USD', exchangeRates);
    
    costs.push({
      item: balsaType,
      details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${balsaCostBRL.toFixed(2)} = R$ ${balsaTotalBRL.toFixed(2)}`,
      value: balsaCostUSD
    });
    
    // Removemos a opção de balsa Sanga Funda conforme solicitado pelo cliente
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
    const parkingCostUSD = convertCurrency(parkingCostBRL, 'BRL', 'USD', exchangeRates);
    
    costs.push({
      item: "Estacionamento",
      details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${(aduanaInfo.estacionamento_cost || 0).toFixed(2)}`,
      value: parkingCostUSD
    });
  }
  
  // 7. Dinatran cost if applicable
  if (aduanaInfo.dinatran_cost) {
    const dinatranCostBRL = trucks * aduanaInfo.dinatran_cost;
    const dinatranCostUSD = convertCurrency(dinatranCostBRL, 'BRL', 'USD', exchangeRates);
    
    costs.push({
      item: "Dinatran",
      details: `${trucks} caminhão${trucks > 1 ? 's' : ''} × R$ ${(aduanaInfo.dinatran_cost || 0).toFixed(2)}`,
      value: dinatranCostUSD
    });
  }
  
  // 8. Luiz Baciquet commission if applicable
  if (aduanaInfo.has_comissao_luiz && aduanaInfo.comissao_luiz) {
    const commissionBRL = tonnage * aduanaInfo.comissao_luiz;
    const commissionUSD = convertCurrency(commissionBRL, 'BRL', 'USD', exchangeRates);
    
    costs.push({
      item: "Comissão Luiz Baciquet",
      details: `${tonnage} toneladas × R$ ${(aduanaInfo.comissao_luiz || 0).toFixed(2)}/ton`,
      value: commissionUSD
    });
  }
  
  // 9. Driver payment
  const driverTotalBRL = tonnage * driverPaymentBRL;
  const driverTotalUSD = convertCurrency(driverTotalBRL, 'BRL', 'USD', exchangeRates);
  
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
      details: `$${(merchandiseValueUSD || 0).toFixed(2)} × 0.14%`,
      value: insuranceCostUSD
    });
  }
  
  // 11. Special handling if enabled - aumentado para aplicar realmente um custo maior
  if (specialHandling) {
    const specialHandlingCostUSD = tonnage * 2.5; // $2.50 por tonelada para manuseio especial
    
    costs.push({
      item: "Manuseio Especial",
      details: `${tonnage} toneladas × $2.50/ton`,
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

function convertCurrency(
  amount: number,
  fromCurrency: 'USD' | 'BRL' | 'GS',
  toCurrency: 'USD' | 'BRL' | 'GS',
  exchangeRates: ExchangeRates
): number {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  // Convert to USD first (as base currency)
  let amountUsd = amount;
  if (fromCurrency === "BRL") {
    amountUsd = amount / exchangeRates.USD_BRL;
  } else if (fromCurrency === "GS") {
    amountUsd = amount / exchangeRates.USD_GS;
  }
  
  // Convert from USD to target currency
  if (toCurrency === "BRL") {
    return amountUsd * exchangeRates.USD_BRL;
  } else if (toCurrency === "GS") {
    return amountUsd * exchangeRates.USD_GS;
  }
  
  // If toCurrency is USD, amountUsd is already in USD
  return amountUsd;
}
