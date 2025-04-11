import { Request, Response } from 'express';

// Interface for city data
interface City {
  name: string;
  description: string;
  place_id: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

// Mock data for major cities in Brazil and Paraguay
const MOCK_CITIES: City[] = [
  // Paraguay
  {
    name: "Asunción",
    description: "Asunción, Paraguay",
    place_id: "mock_asuncion_py",
    country: "py",
    coordinates: { lat: -25.2637, lng: -57.5759 }
  },
  {
    name: "Ciudad del Este",
    description: "Ciudad del Este, Alto Paraná, Paraguay",
    place_id: "mock_ciudad_del_este_py",
    country: "py",
    coordinates: { lat: -25.5096, lng: -54.6038 }
  },
  {
    name: "Encarnación",
    description: "Encarnación, Itapúa, Paraguay",
    place_id: "mock_encarnacion_py",
    country: "py",
    coordinates: { lat: -27.3307, lng: -55.8657 }
  },
  {
    name: "Pedro Juan Caballero",
    description: "Pedro Juan Caballero, Amambay, Paraguay",
    place_id: "mock_pedro_juan_caballero_py",
    country: "py",
    coordinates: { lat: -22.5470, lng: -55.7345 }
  },
  {
    name: "Concepción",
    description: "Concepción, Paraguay",
    place_id: "mock_concepcion_py",
    country: "py",
    coordinates: { lat: -23.4064, lng: -57.4341 }
  },
  {
    name: "Salto del Guaíra",
    description: "Salto del Guaíra, Canindeyú, Paraguay",
    place_id: "mock_salto_del_guaira_py",
    country: "py",
    coordinates: { lat: -24.0886, lng: -54.3368 }
  },
  {
    name: "INPASA del Paraguay",
    description: "INPASA del Paraguay S.A., Ruta Nro. VI, km 45, Nueva Esperanza, Paraguay",
    place_id: "mock_inpasa_py",
    country: "py",
    coordinates: { lat: -24.4720, lng: -54.8620 }
  },
  {
    name: "Puerto Indio",
    description: "Puerto Indio, Paraguay",
    place_id: "mock_puerto_indio_py",
    country: "py",
    coordinates: { lat: -24.9164, lng: -54.4609 }
  },
  
  // Brazil
  {
    name: "São Paulo",
    description: "São Paulo, SP, Brasil",
    place_id: "mock_sao_paulo_br",
    country: "br",
    coordinates: { lat: -23.5505, lng: -46.6333 }
  },
  {
    name: "Rio de Janeiro",
    description: "Rio de Janeiro, RJ, Brasil",
    place_id: "mock_rio_de_janeiro_br",
    country: "br",
    coordinates: { lat: -22.9068, lng: -43.1729 }
  },
  {
    name: "Curitiba",
    description: "Curitiba, PR, Brasil",
    place_id: "mock_curitiba_br",
    country: "br",
    coordinates: { lat: -25.4290, lng: -49.2671 }
  },
  {
    name: "Porto Alegre",
    description: "Porto Alegre, RS, Brasil",
    place_id: "mock_porto_alegre_br",
    country: "br",
    coordinates: { lat: -30.0346, lng: -51.2177 }
  },
  {
    name: "Campo Grande",
    description: "Campo Grande, MS, Brasil",
    place_id: "mock_campo_grande_br",
    country: "br",
    coordinates: { lat: -20.4697, lng: -54.6201 }
  },
  {
    name: "Foz do Iguaçu",
    description: "Foz do Iguaçu, PR, Brasil",
    place_id: "mock_foz_do_iguacu_br",
    country: "br",
    coordinates: { lat: -25.5478, lng: -54.5882 }
  },
  {
    name: "Guaíra",
    description: "Guaíra, PR, Brasil",
    place_id: "mock_guaira_br",
    country: "br",
    coordinates: { lat: -24.0860, lng: -54.2567 }
  },
  {
    name: "Santa Helena",
    description: "Santa Helena, PR, Brasil",
    place_id: "mock_santa_helena_br",
    country: "br",
    coordinates: { lat: -24.9264, lng: -54.3811 }
  },
  {
    name: "Mundo Novo",
    description: "Mundo Novo, MS, Brasil",
    place_id: "mock_mundo_novo_br",
    country: "br",
    coordinates: { lat: -23.9421, lng: -54.2805 }
  },
  {
    name: "BRF S.A.",
    description: "BRF S.A., Rua José Tozzeti, BR",
    place_id: "mock_brf_br",
    country: "br",
    coordinates: { lat: -23.4983, lng: -46.8350 }
  }
];

/**
 * Mock place search handler - used when Google Places API is unavailable
 */
export async function mockPlaceSearch(req: Request, res: Response) {
  try {
    const { query, country } = req.query;
    
    // Validate query parameter
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Consulta inválida. Forneça um termo de busca válido.'
      });
    }
    
    // Filter cities by country if specified
    let filteredCities = MOCK_CITIES;
    if (country === 'br' || country === 'py') {
      filteredCities = MOCK_CITIES.filter(city => city.country === country);
    }
    
    // Search for places that match the query
    const results = filteredCities
      .filter(city => 
        city.name.toLowerCase().includes(query.toLowerCase()) || 
        city.description.toLowerCase().includes(query.toLowerCase())
      )
      .map(city => ({
        description: city.description,
        place_id: city.place_id
      }))
      .slice(0, 5); // Limit to 5 results like Google Places API
    
    console.log(`Buscando lugares mock para: "${query}" (${results.length} resultados)`);
    
    res.json(results);
  } catch (error) {
    console.error('Erro no mock de busca de lugares:', error);
    res.status(500).json({
      error: 'Erro ao processar a busca de lugares'
    });
  }
}

/**
 * Mock place details handler - used when Google Places API is unavailable
 */
export async function mockPlaceDetails(req: Request, res: Response) {
  try {
    const { place_id } = req.query;
    
    // Validate place_id parameter
    if (!place_id || typeof place_id !== 'string') {
      return res.status(400).json({
        error: 'ID do lugar inválido.'
      });
    }
    
    // Find the city by place_id
    const city = MOCK_CITIES.find(c => c.place_id === place_id);
    
    if (!city) {
      return res.status(404).json({
        error: 'Local não encontrado.'
      });
    }
    
    // Return formatted place details
    res.json({
      name: city.name,
      address: city.description,
      coordinates: city.coordinates,
      isMockData: true // Indicate this is mock data
    });
  } catch (error) {
    console.error('Erro no mock de detalhes do lugar:', error);
    res.status(500).json({
      error: 'Erro ao processar detalhes do lugar'
    });
  }
}