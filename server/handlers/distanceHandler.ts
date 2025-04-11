import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { calculateMockDistance } from './mockDistanceHandler';
import { storage } from '../storage';

// Get Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Interface para parâmetros de cálculo de distância
 * Usada pela versão interna da função calculateDistanceInternal
 */
export interface DistanceCalculationParams {
  origin: string;
  destination: string;
  aduanaBr: string;
  origin_place_id?: string;
  destination_place_id?: string;
  origin_lat?: string;
  origin_lng?: string;
  destination_lat?: string;
  destination_lng?: string;
  forceMock?: boolean;
}

/**
 * Calculate route distance via aduana using Google Maps Distance Matrix API
 * Falls back to mock/approximated data if the API is unavailable
 */
/**
 * Versão interna do cálculo de distância que não depende de Express
 * Pode ser usada por outros handlers sem necessidade de objetos Request/Response
 */
export async function calculateDistanceInternal(params: DistanceCalculationParams): Promise<any> {
  const { 
    origin, 
    destination, 
    aduanaBr,
    origin_place_id,
    destination_place_id,
    origin_lat,
    origin_lng,
    destination_lat,
    destination_lng,
    forceMock = false
  } = params;
  
  // Log detalhado para debugging
  console.log("calculateDistanceInternal - Recebidos:", {
    origin,
    destination,
    aduanaBr,
    origin_place_id,
    destination_place_id,
    origin_lat,
    origin_lng,
    destination_lat,
    destination_lng,
    forceMock
  });
  
  // Validate required fields
  if (!origin || !destination || !aduanaBr) {
    throw new Error('Campos obrigatórios ausentes. Origem, destino e aduana brasileira são necessários.');
  }
  
  // Verificamos se temos place IDs ou coordenadas para cálculo de distância
  const hasPlaceIds = !!(origin_place_id && destination_place_id);
  const hasOriginCoordinates = !!(origin_lat && origin_lng);
  const hasDestinationCoordinates = !!(destination_lat && destination_lng);
  
  // Verificações mais detalhadas para debug
  console.log("calculateDistanceInternal - Verificando dados de localização:", {
    hasPlaceIds,
    hasOriginCoordinates,
    hasDestinationCoordinates,
    origin_place_id,
    destination_place_id,
    origin_lat,
    origin_lng,
    destination_lat,
    destination_lng
  });
  
  // Se não temos nem place IDs completos nem pelo menos coordenadas parciais, retornamos erro
  const hasValidLocationData = hasPlaceIds || 
                            (hasOriginCoordinates && (destination_place_id || hasDestinationCoordinates)) || 
                            (hasDestinationCoordinates && (origin_place_id || hasOriginCoordinates));
  
  if (!hasValidLocationData) {
    throw new Error('Dados de localização insuficientes. Forneça place IDs ou coordenadas (lat/lng) para origem e destino.');
  }
  
  // Verify Google Maps API key
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Configuração do Google Maps API não encontrada. Entre em contato com o administrador do sistema.');
  }
  
  // Get paired aduana
  const aduanaPy = getParaguayanAduana(aduanaBr);
  if (!aduanaPy) {
    throw new Error(`Aduana brasileira inválida: ${aduanaBr}`);
  }
  
  try {
    console.log(`🌍 Iniciando cálculo de rota via Google Maps API...`);
    console.log(`Origem: ${origin}${origin_place_id ? ` (place_id: ${origin_place_id})` : ''}`);
    console.log(`Destino: ${destination}${destination_place_id ? ` (place_id: ${destination_place_id})` : ''}`);
    console.log(`Via aduanas: ${aduanaPy} (PY) → ${aduanaBr} (BR)`);
    
    // Calculate route via Google Maps API
    const result = await calculateRouteViaAduana(
      origin, 
      destination, 
      aduanaBr, 
      aduanaPy, 
      origin_place_id, 
      destination_place_id,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng
    );
    
    // Log success
    console.log(`✅ Rota calculada com sucesso via Google Maps API!`);
    console.log(`Distância total: ${result.totalDistance} km`);
    
    return result;
  } catch (error) {
    console.error('❌ Erro ao calcular rota via Google Maps API:', error);
    throw error; // Re-lança o erro para ser tratado pelo chamador
  }
}

export async function calculateDistance(req: Request, res: Response) {
  try {
    // Extract parameters from request
    const { 
      origin, 
      destination, 
      aduanaBr,
      origin_place_id,
      destination_place_id,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      forceMock = false // Optional parameter to force mock calculations for testing
    } = req.body;
    
    // Log detalhado para debugging
    console.log("calculateDistance - Recebidos:", {
      origin,
      destination,
      aduanaBr,
      origin_place_id,
      destination_place_id,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      forceMock
    });
    
    // Validate required fields
    if (!origin || !destination || !aduanaBr) {
      console.error("calculateDistance - Erro: Parâmetros insuficientes", {
        origin: !!origin,
        destination: !!destination,
        aduanaBr: !!aduanaBr
      });
      return res.status(400).json({
        message: 'Campos obrigatórios ausentes. Origem, destino e aduana brasileira são necessários.'
      });
    }
    
    // Verificamos se temos place IDs ou coordenadas para cálculo de distância
    const hasPlaceIds = !!(origin_place_id && destination_place_id);
    const hasOriginCoordinates = !!(origin_lat && origin_lng);
    const hasDestinationCoordinates = !!(destination_lat && destination_lng);
    
    // Verificações mais detalhadas para debug
    console.log("calculateDistance - Verificando dados de localização:", {
      hasPlaceIds,
      hasOriginCoordinates,
      hasDestinationCoordinates,
      origin_place_id,
      destination_place_id,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng
    });
    
    // Se não temos nem place IDs completos nem pelo menos coordenadas parciais, retornamos erro
    const hasValidLocationData = hasPlaceIds || 
                                (hasOriginCoordinates && (destination_place_id || hasDestinationCoordinates)) || 
                                (hasDestinationCoordinates && (origin_place_id || hasOriginCoordinates));
    
    if (!hasValidLocationData) {
      console.warn("calculateDistance - Aviso: Dados de localização insuficientes", {
        origin_place_id,
        destination_place_id,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng
      });
      return res.status(400).json({
        message: 'Dados de localização insuficientes. Forneça place IDs ou coordenadas (lat/lng) para origem e destino.',
        error: 'LOCATION_DATA_MISSING'
      });
    }
    
    // Verify Google Maps API key
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ Erro: Google Maps API key não encontrada!');
      return res.status(500).json({
        message: 'Configuração do Google Maps API não encontrada. Entre em contato com o administrador do sistema.',
        error: 'API_KEY_MISSING'
      });
    }
    
    // Get paired aduana
    const aduanaPy = getParaguayanAduana(aduanaBr);
    if (!aduanaPy) {
      return res.status(400).json({
        message: `Aduana brasileira inválida: ${aduanaBr}`
      });
    }
    
    try {
      console.log(`🌍 Iniciando cálculo de rota via Google Maps API...`);
      console.log(`Origem: ${origin}${origin_place_id ? ` (place_id: ${origin_place_id})` : ''}`);
      console.log(`Destino: ${destination}${destination_place_id ? ` (place_id: ${destination_place_id})` : ''}`);
      console.log(`Via aduanas: ${aduanaPy} (PY) → ${aduanaBr} (BR)`);
      
      // Calculate route via Google Maps API
      const result = await calculateRouteViaAduana(
        origin, 
        destination, 
        aduanaBr, 
        aduanaPy, 
        origin_place_id, 
        destination_place_id,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng
      );
      
      // Log success
      console.log(`✅ Rota calculada com sucesso via Google Maps API!`);
      console.log(`Distância total: ${result.totalDistance} km`);
      
      res.json(result);
    } catch (apiError) {
      console.error('❌ Erro ao calcular rota via Google Maps API:', apiError);
      console.error('Detalhes do erro:', apiError instanceof Error ? apiError.stack : 'Erro desconhecido');
      
      // Log detalhado do erro
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erro desconhecido';
      
      // Não usamos mais fallback com dados mockados
      return res.status(500).json({
        message: 'Erro ao calcular rota via Google Maps API. Verifique os dados de origem e destino e tente novamente.',
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Erro ao calcular distância:', error);
    res.status(500).json({ 
      message: 'Erro ao calcular distância', 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
}

/**
 * Get the Paraguayan aduana paired with a Brazilian one
 */
function getParaguayanAduana(aduanaBr: string): string | undefined {
  const ADUANA_PAIRS: Record<string, string> = {
    "Guaíra": "Salto del Guaíra",
    "Mundo Novo": "Salto del Guaíra",
    "Foz do Iguaçu": "Ciudad del Este",
    "Santa Helena": "Puerto Indio"
  };
  
  return ADUANA_PAIRS[aduanaBr];
}

/**
 * Calculate route via aduana using Google Maps API
 */
// Nota: Antigas coordenadas estáticas foram substituídas pelo sistema de configuração
// As coordenadas agora são carregadas dinamicamente do banco de dados

/**
 * Calculate route via aduana using Google Maps API
 */
async function calculateRouteViaAduana(
  origin: string,
  destination: string,
  aduanaBr: string,
  aduanaPy: string,
  origin_place_id: string | undefined = undefined,
  destination_place_id: string | undefined = undefined,
  origin_lat: string | undefined = undefined,
  origin_lng: string | undefined = undefined,
  destination_lat: string | undefined = undefined,
  destination_lng: string | undefined = undefined
): Promise<any> {
  // Log the route calculation request
  console.log(`Calculando rota: ${origin} → ${aduanaPy} → ${aduanaBr} → ${destination}`);
  
  // Format origins and destinations with place_ids if available, coordinates if available, or use names as last resort
  let originParam = origin;
  if (origin_place_id) {
    originParam = `place_id:${origin_place_id}`;
    console.log("Usando place_id para origem");
  } else if (origin_lat && origin_lng) {
    originParam = `${origin_lat},${origin_lng}`;
    console.log("Usando coordenadas para origem");
  }
  
  let destinationParam = destination;
  if (destination_place_id) {
    destinationParam = `place_id:${destination_place_id}`;
    console.log("Usando place_id para destino");
  } else if (destination_lat && destination_lng) {
    destinationParam = `${destination_lat},${destination_lng}`;
    console.log("Usando coordenadas para destino");
  }
  
  // Usar coordenadas exatas para as aduanas para maior precisão
  const aduanaPyParam = `${aduanaPy}, Paraguai`;  // Adicionar país para melhorar a geocodificação
  
  // Casos especiais especificando estados brasileiros para evitar ambiguidades
  let aduanaBrParam;
  if (aduanaBr === "Mundo Novo") {
    aduanaBrParam = `${aduanaBr}, MS, Brasil`;  // Mato Grosso do Sul
  } else if (aduanaBr === "Santa Helena") {
    aduanaBrParam = `${aduanaBr}, PR, Brasil`;  // Paraná
  } else {
    aduanaBrParam = `${aduanaBr}, Brasil`;     // Adicionar país para outros casos
  }
  
  // Registrar os valores iniciais para depuração
  console.log(`Origem: "${origin}", Destino: "${destination}"`);
  console.log(`Aduana BR: "${aduanaBr}", Aduana PY: "${aduanaPy}"`);
  if (origin_place_id) console.log(`Origem place_id: ${origin_place_id}`);
  if (destination_place_id) console.log(`Destino place_id: ${destination_place_id}`);
  
  // Buscar coordenadas do sistema de configuração
  console.log(`Buscando coordenadas de ${aduanaPy} e ${aduanaBr} no sistema de configuração...`);
  // Primeiro tentar buscar do aduana_info que contém os dados mostrados na tela
  console.log('[DISTANCE] Buscando informações de aduanas para coordenadas...');
  
  // Criar um mapa para facilitar a busca
  const aduanaCoordinatesMap: Record<string, { lat: number, lng: number }> = {};
  
  try {
    // Buscar todas as aduanas diretamente usando storage
    const allAduanas = await storage.getAllAduanaInfo();
    console.log(`[DISTANCE] ✅ Recuperadas ${allAduanas.length} aduanas do banco`);
    
    // Mapear as coordenadas de cada aduana
    allAduanas.forEach(aduana => {
      console.log(`[DISTANCE] Processando aduana: ${aduana.name}`);
      
      if (aduana.coordinates && typeof aduana.coordinates === 'object') {
        console.log(`[DISTANCE] Coordenadas encontradas para ${aduana.name}: ${JSON.stringify(aduana.coordinates)}`);
        aduanaCoordinatesMap[aduana.name] = {
          lat: aduana.coordinates.lat || 0,
          lng: aduana.coordinates.lng || 0
        };
      } else {
        console.log(`[DISTANCE] ⚠️ Sem coordenadas para aduana ${aduana.name}`);
      }
    });
  } catch (error) {
    console.error('[DISTANCE] ❌ Erro ao buscar aduanas:', error);
  }
  
  // Mostramos apenas a contagem para evitar logs muito grandes
  console.log(`[DISTANCE] Mapa de coordenadas criado com ${Object.keys(aduanaCoordinatesMap).length} entradas`);
  
  // Adicionar COORDENADAS FIXAS DE EMERGÊNCIA caso não consigamos obter as coordenadas
  console.log('[DISTANCE] Adicionando coordenadas fixas de emergência ao mapa');
  
  // Coordenadas fixas para aduanas brasileiras (se não forem encontradas no banco)
  if (!aduanaCoordinatesMap['Foz do Iguaçu']) {
    console.log('[DISTANCE] Adicionando coordenadas fixas para Foz do Iguaçu');
    aduanaCoordinatesMap['Foz do Iguaçu'] = { lat: -25.5094, lng: -54.5967 };
  }
  
  if (!aduanaCoordinatesMap['Santa Helena']) {
    console.log('[DISTANCE] Adicionando coordenadas fixas para Santa Helena');
    aduanaCoordinatesMap['Santa Helena'] = { lat: -24.869651309318915, lng: -54.352615179610815 };
  }
  
  if (!aduanaCoordinatesMap['Guaíra']) {
    console.log('[DISTANCE] Adicionando coordenadas fixas para Guaíra');
    aduanaCoordinatesMap['Guaíra'] = { lat: -24.0860, lng: -54.2567 };
  }
  
  if (!aduanaCoordinatesMap['Mundo Novo']) {
    console.log('[DISTANCE] Adicionando coordenadas fixas para Mundo Novo');
    aduanaCoordinatesMap['Mundo Novo'] = { lat: -23.9421, lng: -54.2805 };
  }
  
  // Coordenadas fixas para aduanas paraguaias (se não forem encontradas no banco)
  if (!aduanaCoordinatesMap['Ciudad del Este']) {
    console.log('[DISTANCE] Adicionando coordenadas fixas para Ciudad del Este');
    aduanaCoordinatesMap['Ciudad del Este'] = { lat: -25.5096, lng: -54.6038 };
  }
  
  if (!aduanaCoordinatesMap['Puerto Indio']) {
    console.log('[DISTANCE] Adicionando coordenadas fixas para Puerto Indio');
    aduanaCoordinatesMap['Puerto Indio'] = { lat: -24.921943241362257, lng: -54.47763737839428 };
  }
  
  if (!aduanaCoordinatesMap['Salto del Guaíra']) {
    console.log('[DISTANCE] Adicionando coordenadas fixas para Salto del Guaíra');
    aduanaCoordinatesMap['Salto del Guaíra'] = { lat: -24.0886, lng: -54.3368 };
  }
  
  // Buscar a configuração do sistema como fallback
  let config;
  try {
    console.log('[DISTANCE] Buscando configuração do sistema para coordenadas alternativas...');
    config = await storage.getSystemConfig();
    console.log('[DISTANCE] ✅ Configuração do sistema recuperada');
    
    if (config?.aduanaCoordinates) {
      console.log(`[DISTANCE] Configuração do sistema tem coordenadas para ${Object.keys(config.aduanaCoordinates).length} aduanas`);
    } else {
      console.log('[DISTANCE] ⚠️ Nenhuma coordenada encontrada na configuração do sistema');
    }
  } catch (error) {
    console.error('[DISTANCE] ❌ Erro ao buscar configuração do sistema:', error);
    // Criamos um objeto vazio para evitar erros de referência nula mais tarde
    config = { aduanaCoordinates: {} };
  }
  
  // Verificar se temos coordenadas para as aduanas (priorizar as coordenadas da interface de configuração)
  let aduanaPyCoord = aduanaCoordinatesMap[aduanaPy] || config?.aduanaCoordinates?.[aduanaPy];
    let aduanaBrCoord = aduanaCoordinatesMap[aduanaBr] || config?.aduanaCoordinates?.[aduanaBr];
  
  // Log de debug para as coordenadas obtidas
  if (aduanaPyCoord) {
    console.log(`Coordenadas para ${aduanaPy}: ${aduanaPyCoord.lat}, ${aduanaPyCoord.lng}`);
  } else {
    console.warn(`⚠️ Coordenadas para ${aduanaPy} não encontradas no sistema de configuração`);
  }
  
  if (aduanaBrCoord) {
    console.log(`Coordenadas para ${aduanaBr}: ${aduanaBrCoord.lat}, ${aduanaBrCoord.lng}`);
  } else {
    console.warn(`⚠️ Coordenadas para ${aduanaBr} não encontradas no sistema de configuração`);
  }
  
  // Se temos um place_id para o destino, essa é a informação mais precisa
  // Só usamos coordenadas fixas como fallback se não temos o place_id ou 
  // se a API falhar mais tarde
  let modifiedDestParam = destinationParam;
  
  try {
    // Use Directions API para rotas precisas
    console.log(`Buscando rota de ${originParam} para ${aduanaPyParam}`);
    console.log(`Buscando rota de ${aduanaBrParam} para ${modifiedDestParam}`);
    
    if (modifiedDestParam !== destinationParam) {
      console.log(`Aviso: Usando coordenadas modificadas para o destino em vez do nome original "${destination}"`);
    }
    
    // Leg 1: Origin to Paraguayan aduana (by place name or coordinates)
    const dirParams1 = new URLSearchParams({
      origin: originParam,
      destination: aduanaPyParam,
      key: GOOGLE_MAPS_API_KEY!
    });
    
    // Leg 2: Brazilian aduana to final destination (by place name or coordinates)
    const dirParams2 = new URLSearchParams({
      origin: aduanaBrParam,
      destination: modifiedDestParam, // Usar o destino modificado que pode conter coordenadas exatas para BRF Toledo
      key: GOOGLE_MAPS_API_KEY!
    });
    
    // Tentar com parâmetros normais primeiro
    let dirResponse1 = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${dirParams1.toString()}`);
    let dirResponse2 = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${dirParams2.toString()}`);
    
    let dirData1 = await dirResponse1.json() as any;
    let dirData2 = await dirResponse2.json() as any;
    
    // Se falhar com nomes de lugares, tentar com coordenadas exatas
    if (dirData1.status !== 'OK' && aduanaPyCoord) {
      console.log(`Tentando com coordenadas exatas para ${aduanaPy}: ${aduanaPyCoord.lat},${aduanaPyCoord.lng}`);
      const altParams1 = new URLSearchParams({
        origin: originParam,
        destination: `${aduanaPyCoord.lat},${aduanaPyCoord.lng}`,
        key: GOOGLE_MAPS_API_KEY!
      });
      
      dirResponse1 = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${altParams1.toString()}`);
      dirData1 = await dirResponse1.json() as any;
    }
    
    if (dirData2.status !== 'OK' && aduanaBrCoord) {
      console.log(`Tentando com coordenadas exatas para ${aduanaBr}: ${aduanaBrCoord.lat},${aduanaBrCoord.lng}`);
      const altParams2 = new URLSearchParams({
        origin: `${aduanaBrCoord.lat},${aduanaBrCoord.lng}`,
        destination: modifiedDestParam, // Usar o parâmetro de destino modificado que pode usar coordenadas para BRF Toledo
        key: GOOGLE_MAPS_API_KEY!
      });
      
      dirResponse2 = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${altParams2.toString()}`);
      dirData2 = await dirResponse2.json() as any;
    }
    
    // Se ainda falhar, verificar se é um destino conhecido e tentar com coordenadas específicas
    if (dirData2.status !== 'OK') {
      // Verificar se o destino é a BRF em Toledo
      const isDestinationBRFToledo = destination.toLowerCase().includes('brf') && 
                                   destination.toLowerCase().includes('toledo');
      
      // Verificar se o destino é Toledo
      const isDestinationToledo = !isDestinationBRFToledo && 
                               destination.toLowerCase().includes('toledo');
      
      // Tentar com coordenadas específicas para locais conhecidos
      if (isDestinationBRFToledo) {
        console.log(`Tentando com coordenadas exatas para BRF Toledo como destino`);
        // Buscar coordenadas do local no sistema de configuração
        const brf = config?.locationCoordinates?.["BRF Toledo"];
        
        if (brf) {
          const altParams2 = new URLSearchParams({
            origin: aduanaBrCoord ? `${aduanaBrCoord.lat},${aduanaBrCoord.lng}` : aduanaBrParam,
            destination: `${brf.lat},${brf.lng}`,
            key: GOOGLE_MAPS_API_KEY!
          });
          
          dirResponse2 = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${altParams2.toString()}`);
          dirData2 = await dirResponse2.json() as any;
        } else {
          console.warn('⚠️ Coordenadas para BRF Toledo não encontradas no sistema de configuração');
        }
      } else if (isDestinationToledo) {
        console.log(`Tentando com coordenadas exatas para Toledo como destino`);
        // Buscar coordenadas do local no sistema de configuração
        const toledo = config?.locationCoordinates?.["Toledo"];
        
        if (toledo) {
          const altParams2 = new URLSearchParams({
            origin: aduanaBrCoord ? `${aduanaBrCoord.lat},${aduanaBrCoord.lng}` : aduanaBrParam,
            destination: `${toledo.lat},${toledo.lng}`,
            key: GOOGLE_MAPS_API_KEY!
          });
        
          dirResponse2 = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${altParams2.toString()}`);
          dirData2 = await dirResponse2.json() as any;
        } else {
          console.warn('⚠️ Coordenadas para Toledo não encontradas no sistema de configuração');
        }
      }
    }
    
    // Debug das respostas
    console.log(`Google Directions API status (leg 1): ${dirData1.status}`);
    console.log(`Google Directions API status (leg 2): ${dirData2.status}`);
    
    // Validar e extrair informações de distância
    if (
      dirData1.status !== 'OK' || 
      dirData2.status !== 'OK' ||
      !dirData1.routes?.length || 
      !dirData2.routes?.length
    ) {
      if (dirData1.status !== 'OK') {
        console.error(`Erro na 1ª parte da rota (${origin} → ${aduanaPy}): ${dirData1.status}`);
        if (dirData1.error_message) console.error(dirData1.error_message);
      }
      
      if (dirData2.status !== 'OK') {
        console.error(`Erro na 2ª parte da rota (${aduanaBr} → ${destination}): ${dirData2.status}`);
        if (dirData2.error_message) console.error(dirData2.error_message);
      }
      
      throw new Error('Não foi possível calcular a rota completa com a API do Google Maps');
    }
    
    // Extrair distâncias da rota a partir da API Directions (em metros)
    let originToAduanaPyDistance = 0;
    let aduanaBrToDestinationDistance = 0;
    
    // Somar as distâncias de todas as etapas da primeira rota
    dirData1.routes[0].legs.forEach((leg: any) => {
      originToAduanaPyDistance += leg.distance.value;
    });
    
    // Somar as distâncias de todas as etapas da segunda rota
    dirData2.routes[0].legs.forEach((leg: any) => {
      aduanaBrToDestinationDistance += leg.distance.value;
    });
    
    // Converter distâncias de metros para quilômetros
    const originToAduanaPy = originToAduanaPyDistance / 1000;
    const aduanaBrToDestination = aduanaBrToDestinationDistance / 1000;
    
    // Distância entre aduanas pareadas (normalmente muito próximas)
    // Usar valor do sistema de configuração ou valor padrão
    const betweenAduanas = config?.defaultCrossingDistance || 5; // Distância para a travessia
    
    // Calcular distância total
    const totalDistance = originToAduanaPy + betweenAduanas + aduanaBrToDestination;
    
    // Obter endereços formatados a partir da resposta da API
    const originAddress = dirData1.routes[0].legs[0]?.start_address || origin;
    const destinationAddress = dirData2.routes[0].legs[0]?.end_address || destination;
    
    const aduanaPyAddress = dirData1.routes[0].legs[0]?.end_address || aduanaPy;
    const aduanaBrAddress = dirData2.routes[0].legs[0]?.start_address || aduanaBr;
    
    // Registrar resultado do cálculo para debug
    console.log(`Distância de ${origin} para ${aduanaPy}: ${Math.round(originToAduanaPy)} km`);
    console.log(`Distância de ${aduanaBr} para ${destination}: ${Math.round(aduanaBrToDestination)} km`);
    console.log(`Distância total via ${aduanaBr}: ${Math.round(totalDistance)} km`);
    
    // Log de potenciais problemas em rotas muito longas
    const WARN_SEGMENT_DISTANCE = 800; // km - apenas para log de aviso
    
    if (originToAduanaPy > WARN_SEGMENT_DISTANCE) {
      console.warn(`⚠️ ALERTA: Distância longa da origem para aduana PY: ${Math.round(originToAduanaPy)} km`);
    }
    
    if (aduanaBrToDestination > WARN_SEGMENT_DISTANCE) {
      console.warn(`⚠️ ALERTA: Distância longa da aduana BR para o destino: ${Math.round(aduanaBrToDestination)} km`);
    }
    
    // Retornar resultado formatado com informações detalhadas
    return {
      totalDistance: Math.round(totalDistance),
      originToAduanaPy: Math.round(originToAduanaPy),
      aduanaBrToDestination: Math.round(aduanaBrToDestination),
      betweenAduanas: Math.round(betweenAduanas),
      origin: {
        name: origin,
        address: originAddress
      },
      destination: {
        name: destination,
        address: destinationAddress
      },
      aduanaBr: {
        name: aduanaBr,
        address: aduanaBrAddress
      },
      aduanaPy: {
        name: aduanaPy,
        address: aduanaPyAddress
      },
      isMockData: false,
      routeDetails: {
        leg1Steps: dirData1.routes[0].legs[0]?.steps?.length || 0,
        leg2Steps: dirData2.routes[0].legs[0]?.steps?.length || 0
      }
    };
  } catch (error) {
    console.error('Erro ao calcular rota com Google Directions API:', error);
    throw error; // Re-lançar o erro para ser tratado pelo chamador
  }
}
