import { collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Nome da coleção para armazenar o cache de lugares
const CACHE_COLLECTION = 'place_cache';

// Tempo de expiração do cache em milissegundos (padrão: 30 dias)
const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

// Interface para dados de lugares em cache
export interface PlaceData {
  place_id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  cachedAt?: Date;
}

/**
 * Classe para gerenciar o cache de lugares do Google Places API
 */
class PlaceCache {
  /**
   * Salva os dados de um lugar no cache
   * @param placeData - Dados do lugar a serem armazenados
   */
  async saveToCache(placeData: PlaceData): Promise<void> {
    try {
      // Verificar se o lugar já existe no cache
      const existingPlace = await this.getFromCache(placeData.place_id);
      
      if (existingPlace) {
        console.log(`Lugar ${placeData.place_id} já existe no cache.`);
        return; // Se já existe, não precisamos adicionar novamente
      }
      
      console.log(`Salvando lugar no cache: ${placeData.name} (${placeData.place_id})`);
      
      // Adicionar o novo documento ao cache
      await addDoc(collection(db, CACHE_COLLECTION), {
        ...placeData,
        cachedAt: serverTimestamp()
      });
      
      console.log(`Lugar ${placeData.place_id} salvo no cache com sucesso.`);
    } catch (error) {
      console.error('Erro ao salvar lugar no cache:', error);
      throw error;
    }
  }
  
  /**
   * Busca os dados de um lugar no cache
   * @param placeId - ID do lugar no Google Places
   * @returns Os dados do lugar ou undefined se não estiver em cache
   */
  async getFromCache(placeId: string): Promise<PlaceData | undefined> {
    try {
      console.log(`Buscando lugar ${placeId} no cache...`);
      
      // Consultar o cache pelo place_id
      const cacheQuery = query(
        collection(db, CACHE_COLLECTION),
        where('place_id', '==', placeId)
      );
      
      const querySnapshot = await getDocs(cacheQuery);
      
      if (querySnapshot.empty) {
        console.log(`Lugar ${placeId} não encontrado no cache.`);
        return undefined;
      }
      
      // Converter o snapshot para um objeto PlaceData
      const placeDoc = querySnapshot.docs[0];
      const placeData = placeDoc.data() as PlaceData;
      
      // Verificar se o cache expirou
      if (placeData.cachedAt) {
        const cachedAt = placeData.cachedAt instanceof Date ? 
          placeData.cachedAt : 
          new Date((placeData.cachedAt as any).seconds * 1000);
          
        const now = new Date();
        const cacheAge = now.getTime() - cachedAt.getTime();
        
        if (cacheAge > CACHE_EXPIRATION_MS) {
          console.log(`Cache para lugar ${placeId} expirou (${Math.round(cacheAge / (24 * 60 * 60 * 1000))} dias).`);
          return undefined;
        }
      }
      
      console.log(`Lugar ${placeId} encontrado no cache.`);
      return placeData;
    } catch (error) {
      console.error(`Erro ao buscar lugar ${placeId} no cache:`, error);
      return undefined;
    }
  }
  
  /**
   * Remove itens expirados do cache
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      console.log('Iniciando limpeza de itens expirados do cache...');
      
      const cacheRef = collection(db, CACHE_COLLECTION);
      const querySnapshot = await getDocs(cacheRef);
      
      if (querySnapshot.empty) {
        console.log('Cache vazio, nada a limpar.');
        return;
      }
      
      const now = new Date().getTime();
      let removedCount = 0;
      
      // Percorrer todos os documentos e verificar expiração
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if (data.cachedAt) {
          const cachedAt = data.cachedAt instanceof Date ? 
            data.cachedAt : 
            new Date(data.cachedAt.seconds * 1000);
            
          const cacheAge = now - cachedAt.getTime();
          
          if (cacheAge > CACHE_EXPIRATION_MS) {
            // Remover documento expirado
            await deleteDoc(doc.ref);
            removedCount++;
          }
        }
      }
      
      console.log(`Limpeza de cache concluída. ${removedCount} itens removidos.`);
    } catch (error) {
      console.error('Erro durante limpeza do cache:', error);
    }
  }
}

// Exportar instância singleton
export const placeCache = new PlaceCache();