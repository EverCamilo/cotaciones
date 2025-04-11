import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { mockPlaceSearch, mockPlaceDetails } from './mockPlacesHandler';
import { placeCache } from '../firebase/placeCache';

// Usar a API key do ambiente
const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

export async function searchPlaces(req: Request, res: Response) {
  const start = performance.now();
  try {
    const { query, country } = req.query;
    
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      console.log(`Busca de lugares rejeitada: consulta inválida - "${query}"`);
      return res.status(400).json({
        error: 'Consulta inválida. Forneça pelo menos 3 caracteres.'
      });
    }
    
    // Executar limpeza periódica do cache (assíncrono, não bloqueia a resposta)
    placeCache.cleanupExpiredCache().catch(err => {
      console.error('Erro na limpeza de cache:', err);
    });
    
    // Se não temos chave da API, retornar erro
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Erro: Google Maps API key não disponível. Verifique as variáveis de ambiente.');
      return res.status(500).json({
        error: 'Configuração do Google Maps API não encontrada. Entre em contato com o administrador do sistema.'
      });
    }
    
    // Preparar requisição
    const url = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
    const params = new URLSearchParams({
      input: query,
      key: GOOGLE_MAPS_API_KEY,
      language: "pt"
    });

    // Adicionar restrição de país (Brasil ou Paraguai)
    if (country === 'br') {
      params.append('components', 'country:br');
    } else if (country === 'py') {
      params.append('components', 'country:py');
    }
    
    console.log(`🔎 Buscando lugares para: "${query}" (país: ${country || 'todos'})`);
    
    try {
      // Make API request
      const response = await fetch(`${url}?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro na resposta da API (${response.status}): ${errorText}`);
        throw new Error(`Erro na requisição à API Places. Código: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (data.status === "OK") {
        // Extract place descriptions
        const predictions = data.predictions.map((prediction: any) => ({
          description: prediction.description,
          place_id: prediction.place_id,
          structured_formatting: {
            main_text: prediction.structured_formatting?.main_text,
            secondary_text: prediction.structured_formatting?.secondary_text
          }
        }));
        
        const elapsed = Math.round(performance.now() - start);
        console.log(`✅ Encontrados ${predictions.length} lugares para "${query}" em ${elapsed}ms`);
        return res.json(predictions);
      } else if (data.status === "ZERO_RESULTS") {
        // No results found, but API is working
        console.log(`ℹ️ Nenhum resultado encontrado para "${query}"`);
        return res.json([]);
      } else {
        console.error(`Erro na API Places (${data.status}): ${data.error_message || 'Sem detalhes'}`);
        throw new Error(`Erro na API Places: ${data.status}`);
      }
    } catch (apiError) {
      console.error('❌ Erro ao acessar API Places:', apiError);
      return res.status(500).json({
        error: 'Erro ao acessar o serviço de busca do Google Places. Tente novamente mais tarde.',
        details: apiError instanceof Error ? apiError.message : 'Erro desconhecido'
      });
    }
  } catch (error) {
    console.error('Erro ao buscar lugares:', error);
    return res.status(500).json({
      error: 'Erro ao buscar lugares',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function getPlaceDetails(req: Request, res: Response) {
  try {
    const { place_id } = req.query;
    
    if (!place_id || typeof place_id !== 'string') {
      return res.status(400).json({
        error: 'ID do lugar inválido.'
      });
    }
    
    try {
      // Primeiro, verificar se temos o lugar em cache
      const cachedPlace = await placeCache.getFromCache(place_id);
      
      // Se encontrado no cache, retornar imediatamente
      if (cachedPlace) {
        console.log(`Retornando detalhes do lugar ${place_id} do cache.`);
        return res.json({
          name: cachedPlace.name,
          address: cachedPlace.address,
          coordinates: cachedPlace.coordinates,
          fromCache: true
        });
      }
      
      // Se não estiver em cache, verificar a API key
      if (!GOOGLE_MAPS_API_KEY) {
        console.error('Erro: Google Maps API key não disponível');
        return res.status(500).json({
          error: 'Configuração do Google Maps API não encontrada. Entre em contato com o administrador do sistema.'
        });
      }
      
      // Preparar requisição à API
      const url = "https://maps.googleapis.com/maps/api/place/details/json";
      const params = new URLSearchParams({
        place_id: place_id,
        fields: "name,formatted_address,geometry",
        key: GOOGLE_MAPS_API_KEY
      });
      
      // Fazer requisição à API
      const response = await fetch(`${url}?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json() as any;
        
        if (data.status === "OK") {
          const result = data.result;
          
          // Preparar os dados para retorno
          const placeDetails = {
            name: result.name,
            address: result.formatted_address,
            coordinates: {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng
            },
            place_id: place_id,
            fromCache: false
          };
          
          // Salvar no cache para futuras requisições
          // Não esperamos a Promise para não atrasar a resposta
          placeCache.saveToCache({
            name: result.name,
            address: result.formatted_address,
            coordinates: {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng
            },
            place_id: place_id
          }).catch(cacheError => {
            console.error(`Erro ao salvar lugar ${place_id} no cache:`, cacheError);
          });
          
          return res.json(placeDetails);
        } else {
          throw new Error(`Erro na API de detalhes do lugar: ${data.status}`);
        }
      } else {
        throw new Error(`Erro na requisição à API de detalhes do lugar. Código: ${response.status}`);
      }
    } catch (apiError) {
      console.error('Erro ao acessar API Places Details:', apiError);
      return res.status(500).json({
        error: 'Erro ao acessar o serviço de detalhes do Google Places. Tente novamente mais tarde.'
      });
    }
  } catch (error) {
    console.error('Erro ao obter detalhes do lugar:', error);
    return res.status(500).json({
      error: 'Erro ao obter detalhes do lugar'
    });
  }
}