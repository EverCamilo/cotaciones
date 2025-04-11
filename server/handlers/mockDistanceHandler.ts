import { Request, Response } from 'express';
import { calculateHaversineDistance } from '../../client/src/utils/distanceCalculator';
import { storage } from '../storage';
import fetch from 'node-fetch';

// Interface for coordinates
interface Coordinates {
  lat: number;
  lng: number;
}

// City data for lookup
interface CityData {
  name: string;
  country: string;
  coordinates: Coordinates;
}

// Major cities in Brazil and Paraguay
const MAJOR_CITIES: Record<string, CityData> = {
  // Paraguay
  "Asunción": {
    name: "Asunción",
    country: "PY",
    coordinates: { lat: -25.2637, lng: -57.5759 }
  },
  "Ciudad del Este": {
    name: "Ciudad del Este",
    country: "PY", 
    coordinates: { lat: -25.5096, lng: -54.6038 }
  },
  "Encarnación": {
    name: "Encarnación",
    country: "PY",
    coordinates: { lat: -27.3307, lng: -55.8657 }
  },
  "Pedro Juan Caballero": {
    name: "Pedro Juan Caballero",
    country: "PY",
    coordinates: { lat: -22.5470, lng: -55.7345 }
  },
  "Concepción": {
    name: "Concepción",
    country: "PY",
    coordinates: { lat: -23.4064, lng: -57.4341 }
  },
  
  // Brazil
  "São Paulo": {
    name: "São Paulo",
    country: "BR",
    coordinates: { lat: -23.5505, lng: -46.6333 }
  },
  "Rio de Janeiro": {
    name: "Rio de Janeiro",
    country: "BR",
    coordinates: { lat: -22.9068, lng: -43.1729 }
  },
  "Curitiba": {
    name: "Curitiba",
    country: "BR",
    coordinates: { lat: -25.4290, lng: -49.2671 }
  },
  "Porto Alegre": {
    name: "Porto Alegre",
    country: "BR",
    coordinates: { lat: -30.0346, lng: -51.2177 }
  },
  "Campo Grande": {
    name: "Campo Grande",
    country: "BR",
    coordinates: { lat: -20.4697, lng: -54.6201 }
  },
  "Foz do Iguaçu": {
    name: "Foz do Iguaçu",
    country: "BR",
    coordinates: { lat: -25.5478, lng: -54.5882 }
  },
  "Toledo": {
    name: "Toledo",
    country: "BR",
    coordinates: { lat: -24.7246, lng: -53.7412 }
  }
};

// Aduana (customs point) data
const ADUANAS: Record<string, CityData> = {
  // Brazilian aduanas
  "Guaíra": {
    name: "Guaíra",
    country: "BR",
    coordinates: { lat: -24.0860, lng: -54.2567 }
  },
  "Mundo Novo": {
    name: "Mundo Novo",
    country: "BR",
    coordinates: { lat: -23.9421, lng: -54.2805 }
  },
  "Foz do Iguaçu": {
    name: "Foz do Iguaçu",
    country: "BR",
    coordinates: { lat: -25.5094, lng: -54.5967 }
  },
  "Santa Helena": {
    name: "Santa Helena",
    country: "BR",
    coordinates: { lat: -24.869651309318915, lng: -54.352615179610815 }
  },
  
  // Paraguayan aduanas
  "Salto del Guaíra": {
    name: "Salto del Guaíra",
    country: "PY",
    coordinates: { lat: -24.0886, lng: -54.3368 }
  },
  "Ciudad del Este": {
    name: "Ciudad del Este",
    country: "PY",
    coordinates: { lat: -25.5096, lng: -54.6038 }
  },
  "Puerto Indio": {
    name: "Puerto Indio",
    country: "PY",
    coordinates: { lat: -24.921943241362257, lng: -54.47763737839428 }
  }
};

// Pairings between Brazilian and Paraguayan aduanas
const ADUANA_PAIRS: Record<string, string> = {
  "Guaíra": "Salto del Guaíra",
  "Mundo Novo": "Salto del Guaíra",
  "Foz do Iguaçu": "Ciudad del Este",
  "Santa Helena": "Puerto Indio"
};

// Route request interface
interface RouteRequest {
  origin: string;
  destination: string;
  aduanaBr: string;
  origin_place_id?: string;
  destination_place_id?: string;
}

/**
 * Mock distance calculation handler when Google Maps API is not available
 */
export async function calculateMockDistance(req: Request, res: Response) {
  try {
    const { origin, destination, aduanaBr, origin_place_id, destination_place_id } = req.body as RouteRequest;
    
    // Validate required fields
    if (!origin || !destination || !aduanaBr) {
      return res.status(400).json({
        message: 'Campos obrigatórios ausentes. Origem, destino e aduana brasileira são necessários.'
      });
    }
    
    // Get the corresponding Paraguayan aduana
    const aduanaPy = ADUANA_PAIRS[aduanaBr];
    
    if (!aduanaPy) {
      return res.status(400).json({
        message: `Aduana brasileira inválida: ${aduanaBr}`
      });
    }
    
    console.log(`Calculando rota mock via aduana: ${aduanaBr} / ${aduanaPy}`);
    
    // Obter sistema de configuração para coordenadas personalizadas
    const config = await storage.getSystemConfig();
    const aduanaCoords = await storage.getAduanaCoordinates();
    
    // Se temos os place_ids, buscar as coordenadas do Google Places
    let originCoords: Coordinates;
    let destinationCoords: Coordinates;
    
    // Tenta obter coordenadas do Google Places para origem e destino usando APIs diretamente
    if (origin_place_id) {
      try {
        // Em vez de fazer uma chamada HTTP interna, vamos usar diretamente o handler
        const mockHandler = require('../handlers/mockPlacesHandler');
        if (origin_place_id.includes('INPASA') || origin_place_id.toLowerCase().includes('san pedro')) {
          console.log('Detectada INPASA, usando coordenadas específicas');
          originCoords = { lat: -24.211532, lng: -56.563981 };
        } else {
          originCoords = findLocationCoordinates(origin, 'PY');
        }
      } catch (error) {
        console.error('Erro ao processar coordenadas de origem:', error);
        originCoords = findLocationCoordinates(origin, 'PY');
      }
    } else {
      originCoords = findLocationCoordinates(origin, 'PY');
      console.log(`Usando coordenadas de fallback para origem: ${JSON.stringify(originCoords)}`);
    }
    
    if (destination_place_id) {
      try {
        if (destination_place_id.includes('BRF') || destination_place_id.toLowerCase().includes('toledo')) {
          console.log('Detectado BRF Toledo, usando coordenadas específicas de Toledo');
          destinationCoords = MAJOR_CITIES["Toledo"].coordinates;
        } else {
          destinationCoords = findLocationCoordinates(destination, 'BR');
        }
      } catch (error) {
        console.error('Erro ao processar coordenadas de destino:', error);
        destinationCoords = findLocationCoordinates(destination, 'BR');
      }
    } else {
      destinationCoords = findLocationCoordinates(destination, 'BR');
      console.log(`Usando coordenadas de fallback para destino: ${JSON.stringify(destinationCoords)}`);
    }
    
    // Get aduana coordinates from system config with fallback to hard-coded coordinates
    let aduanaBrCoords;
    let aduanaPyCoords;
    
    // Tentar obter coordenadas a partir da configuração do sistema
    if (aduanaCoords && aduanaBr in aduanaCoords) {
      aduanaBrCoords = aduanaCoords[aduanaBr];
      console.log(`Usando coordenadas personalizadas para ${aduanaBr}: ${JSON.stringify(aduanaBrCoords)}`);
    } else {
      aduanaBrCoords = ADUANAS[aduanaBr]?.coordinates;
      console.log(`Usando coordenadas padrão para ${aduanaBr}: ${JSON.stringify(aduanaBrCoords)}`);
    }
    
    if (aduanaCoords && aduanaPy in aduanaCoords) {
      aduanaPyCoords = aduanaCoords[aduanaPy];
      console.log(`Usando coordenadas personalizadas para ${aduanaPy}: ${JSON.stringify(aduanaPyCoords)}`);
    } else {
      aduanaPyCoords = ADUANAS[aduanaPy]?.coordinates;
      console.log(`Usando coordenadas padrão para ${aduanaPy}: ${JSON.stringify(aduanaPyCoords)}`);
    }
    
    if (!aduanaBrCoords || !aduanaPyCoords) {
      console.warn(`Coordenadas não encontradas para ${aduanaBr} ou ${aduanaPy}, usando valores padrão`);
      aduanaBrCoords = ADUANAS[aduanaBr]?.coordinates;
      aduanaPyCoords = ADUANAS[aduanaPy]?.coordinates;
      
      if (!aduanaBrCoords || !aduanaPyCoords) {
        return res.status(500).json({
          message: 'Coordenadas de aduana não encontradas'
        });
      }
    }
    
    // Calculate distances using Haversine formula
    const originToAduanaPy = calculateHaversineDistance(
      originCoords.lat, originCoords.lng,
      aduanaPyCoords.lat, aduanaPyCoords.lng
    );
    
    const aduanaBrToDestination = calculateHaversineDistance(
      aduanaBrCoords.lat, aduanaBrCoords.lng,
      destinationCoords.lat, destinationCoords.lng
    );
    
    // Apply routing factor to account for road network (not straight lines)
    const routingFactor = 1.3;
    
    // Calculate total distance with routing factor
    // Usar valor do sistema de configuração ou valor padrão
    const betweenAduanas = config?.defaultCrossingDistance || 5; // Distância para a travessia
    const totalDistance = (originToAduanaPy + betweenAduanas + aduanaBrToDestination) * routingFactor;
    
    // Calcular distâncias com fator de roteamento
    const originToAduanaPyRouted = originToAduanaPy * routingFactor;
    const aduanaBrToDestinationRouted = aduanaBrToDestination * routingFactor;
    
    // Log de rotas potencialmente problemáticas (apenas para diagnóstico)
    const WARN_SEGMENT_DISTANCE = 800; // km
    
    if (originToAduanaPyRouted > WARN_SEGMENT_DISTANCE) {
      console.warn(`⚠️ [Mock] Distância longa da origem para aduana PY: ${Math.round(originToAduanaPyRouted)} km`);
    }
    
    if (aduanaBrToDestinationRouted > WARN_SEGMENT_DISTANCE) {
      console.warn(`⚠️ [Mock] Distância longa da aduana BR para o destino: ${Math.round(aduanaBrToDestinationRouted)} km`);
    }
    
    // Return the calculated result
    res.json({
      totalDistance: Math.round(totalDistance),
      originToAduanaPy: Math.round(originToAduanaPyRouted),
      aduanaBrToDestination: Math.round(aduanaBrToDestinationRouted),
      betweenAduanas: Math.round(betweenAduanas * routingFactor),
      origin: {
        name: origin,
        coordinates: originCoords
      },
      destination: {
        name: destination,
        coordinates: destinationCoords 
      },
      aduanaBr: {
        name: aduanaBr,
        coordinates: aduanaBrCoords
      },
      aduanaPy: {
        name: aduanaPy,
        coordinates: aduanaPyCoords
      },
      isMockData: true // Indicate this is approximated data
    });
    
  } catch (error) {
    console.error('Erro ao calcular distância mock:', error);
    res.status(500).json({
      message: 'Erro ao calcular distância', 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Find coordinates for a location by trying different matching strategies
 */
function findLocationCoordinates(location: string, defaultCountry: 'BR' | 'PY'): Coordinates {
  // Nota: Idealmente, deveríamos verificar as coordenadas no sistema de configuração,
  // mas isso exigiria tornar esta função assíncrona e refatorar o código chamador.
  // Por enquanto, continuamos usando as coordenadas fixas.
  
  // Try to match exact aduana name
  if (location in ADUANAS) {
    return ADUANAS[location].coordinates;
  }
  
  // Try to match exact city name
  if (location in MAJOR_CITIES) {
    return MAJOR_CITIES[location].coordinates;
  }
  
  // Handle specific cases like BRF in Toledo
  if (location.toLowerCase().includes('brf') && location.toLowerCase().includes('toledo')) {
    console.log(`Correspondência encontrada para BRF Toledo, usando coordenadas de Toledo`);
    return MAJOR_CITIES["Toledo"].coordinates;
  }
  
  // Casos específicos de locais frequentemente utilizados
  if (location.toLowerCase().includes('inpasa') && location.toLowerCase().includes('san pedro')) {
    console.log(`Correspondência encontrada para INPASA San Pedro, usando coordenadas específicas`);
    return { lat: -24.211532, lng: -56.563981 }; // Coordenadas de San Pedro del Paraná
  }
  
  // Try to match partial city name
  for (const city of Object.values(MAJOR_CITIES)) {
    if (
      location.toLowerCase().includes(city.name.toLowerCase()) && 
      city.country === defaultCountry
    ) {
      return city.coordinates;
    }
  }
  
  // No match found, use a default city based on country
  const defaultCity = defaultCountry === 'PY' ? "Asunción" : "São Paulo";
  console.log(`Nenhuma correspondência encontrada para ${location}, usando coordenadas de ${defaultCity} como fallback`);
  
  return MAJOR_CITIES[defaultCity].coordinates;
}