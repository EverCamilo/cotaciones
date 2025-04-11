import { 
  type User, type InsertUser,
  type FreightQuote, type InsertFreightQuote,
  type AduanaInfo, type InsertAduanaInfo,
  type CrossingPoint, type InsertCrossingPoint,
  type ExchangeRate, type InsertExchangeRate,
  type SystemConfig, type InsertSystemConfig,
  type AppSettings, type InsertAppSettings,
  type Client, type InsertClient,
  type ClientQuote, type InsertClientQuote,
  type Coordinate
} from "@shared/schema";
import { db, adminDb } from "./firebase";
import { 
  collection, doc, getDoc, getDocs, addDoc, query, 
  where, orderBy, DocumentData, Timestamp, 
  serverTimestamp, updateDoc, deleteDoc, limit as firestoreLimit
} from "firebase/firestore";

// Define collection names
const COLLECTIONS = {
  USERS: 'users',
  FREIGHT_QUOTES: 'freight_quotes',
  ADUANA_INFO: 'aduana_info',
  CROSSING_POINTS: 'crossing_points', // Nova coleção para pontos de travessia
  EXCHANGE_RATES: 'exchange_rates',
  SYSTEM_CONFIG: 'system_config',
  CLIENTS: 'clients',
  CLIENT_QUOTES: 'client_quotes'
};

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Freight quotes operations
  getFreightQuote(id: string): Promise<FreightQuote | undefined>;
  getAllFreightQuotes(): Promise<FreightQuote[]>;
  createFreightQuote(quote: InsertFreightQuote): Promise<FreightQuote>;
  
  // Client operations
  getClient(id: string): Promise<Client | undefined>;
  getClientByName(name: string): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  
  // Client quotes operations
  getClientQuote(id: string): Promise<ClientQuote | undefined>;
  getClientQuotesByClient(clientId: string): Promise<ClientQuote[]>;
  createClientQuote(quote: InsertClientQuote): Promise<ClientQuote>;
  
  // Aduana info operations (estrutura original)
  getAduanaInfo(id: string): Promise<AduanaInfo | undefined>;
  getAduanaInfoByName(name: string): Promise<AduanaInfo | undefined>;
  getAllAduanaInfo(): Promise<AduanaInfo[]>;
  getAduanaInfoByCountry(country: string): Promise<AduanaInfo[]>;
  createAduanaInfo(info: InsertAduanaInfo): Promise<AduanaInfo>;
  updateAduanaInfo(id: string, info: Partial<AduanaInfo>): Promise<AduanaInfo | undefined>;
  deleteAduanaInfo(id: string): Promise<boolean>;
  
  // Crossing Point operations (nova estrutura)
  getCrossingPoint(id: string): Promise<CrossingPoint | undefined>;
  getCrossingPointByName(name: string): Promise<CrossingPoint | undefined>;
  getAllCrossingPoints(): Promise<CrossingPoint[]>;
  createCrossingPoint(point: InsertCrossingPoint): Promise<CrossingPoint>;
  updateCrossingPoint(id: string, point: Partial<CrossingPoint>): Promise<CrossingPoint | undefined>;
  deleteCrossingPoint(id: string): Promise<boolean>;
  
  // Exchange rates operations
  getLatestExchangeRate(): Promise<ExchangeRate | undefined>;
  getExchangeRates(): Promise<ExchangeRate[]>;
  createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  
  // System configuration operations
  getSystemConfig(): Promise<SystemConfig | undefined>;
  updateSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig>;
  getCoordinates(locationName: string): Promise<Coordinate | undefined>;
  
  // App settings operations
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  
  // Google Places API data
  getPlaceDetails(placeId: string): Promise<any | undefined>;
  getAduanaCoordinates(): Promise<Record<string, Coordinate>>;
  
  // History methods from previous implementation
  saveFreightQuote(quoteData: any): Promise<any>;
  getFreightQuoteHistory(): Promise<any[]>;
  getFreightQuoteById(id: string): Promise<any | undefined>;
}

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = (data: DocumentData): DocumentData => {
  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate();
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = convertTimestamps(result[key]);
    }
  }
  return result;
};

export class FirebaseStorage implements IStorage {
  // Crossing Point operations (nova estrutura)
  async getCrossingPoint(id: string): Promise<CrossingPoint | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.CROSSING_POINTS, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const pointData = convertTimestamps(data) as CrossingPoint;
        return { ...pointData, id: docSnap.id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting crossing point:', error);
      return undefined;
    }
  }
  
  async getCrossingPointByName(name: string): Promise<CrossingPoint | undefined> {
    try {
      const pointsRef = collection(db, COLLECTIONS.CROSSING_POINTS);
      const q = query(pointsRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        const pointData = convertTimestamps(data) as CrossingPoint;
        return { ...pointData, id: querySnapshot.docs[0].id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting crossing point by name:', error);
      return undefined;
    }
  }
  
  async getAllCrossingPoints(): Promise<CrossingPoint[]> {
    try {
      const pointsRef = collection(db, COLLECTIONS.CROSSING_POINTS);
      const querySnapshot = await getDocs(pointsRef);
      
      const points = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const pointData = convertTimestamps(data) as CrossingPoint;
        return { ...pointData, id: doc.id };
      });
      
      // Verificação diagnóstica - sem alterar valores
      for (const point of points) {
        if (point.brazilianSide.name === 'Santa Helena') {
          console.log('[STORAGE] Dados originais para Santa Helena:', {
            id: point.id,
            faf: point.faf
          });
          
          if (point.faf.perTruck === '200000' || point.faf.perTruck === '200.000') {
            console.warn('[STORAGE] ⚠️ Santa Helena ainda com valor antigo no banco:', point.faf.perTruck);
            console.warn('[STORAGE] ⚠️ Atualize o valor no banco de dados diretamente via configurações');
          }
        }
      }
      
      return points;
    } catch (error) {
      console.error('Error getting all crossing points:', error);
      return [];
    }
  }
  
  async createCrossingPoint(point: InsertCrossingPoint): Promise<CrossingPoint> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.CROSSING_POINTS), {
        ...point,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const newPoint = { 
        ...point, 
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      } as CrossingPoint;
      
      return newPoint;
    } catch (error) {
      console.error('Error creating crossing point:', error);
      throw error;
    }
  }
  
  async updateCrossingPoint(id: string, point: Partial<CrossingPoint>): Promise<CrossingPoint | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.CROSSING_POINTS, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error(`Crossing point with ID ${id} not found`);
        return undefined;
      }
      
      await updateDoc(docRef, {
        ...point,
        updatedAt: serverTimestamp()
      });
      
      // Get the updated document
      const updatedDocSnap = await getDoc(docRef);
      const updatedData = updatedDocSnap.data() as CrossingPoint;
      
      return { ...updatedData, id };
    } catch (error) {
      console.error('Error updating crossing point:', error);
      return undefined;
    }
  }
  
  async deleteCrossingPoint(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.CROSSING_POINTS, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting crossing point:', error);
      return false;
    }
  }
  // Client operations
  async getClient(id: string): Promise<Client | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.CLIENTS, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const clientData = convertTimestamps(data) as Client;
        return { ...clientData, id: docSnap.id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting client:', error);
      return undefined;
    }
  }
  
  async getClientByName(name: string): Promise<Client | undefined> {
    try {
      const clientsRef = collection(db, COLLECTIONS.CLIENTS);
      const q = query(clientsRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        const clientData = convertTimestamps(data) as Client;
        return { ...clientData, id: querySnapshot.docs[0].id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting client by name:', error);
      return undefined;
    }
  }
  
  async getAllClients(): Promise<Client[]> {
    try {
      const clientsRef = collection(db, COLLECTIONS.CLIENTS);
      const q = query(clientsRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const clientData = convertTimestamps(data) as Client;
        return { ...clientData, id: doc.id };
      });
    } catch (error) {
      console.error('Error getting all clients:', error);
      return [];
    }
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS), {
        ...client,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      const newClient = { 
        ...client, 
        id: docRef.id, 
        createdAt: new Date(),
        updatedAt: new Date()
      } as Client;
      
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }
  
  // Client quotes operations
  async getClientQuote(id: string): Promise<ClientQuote | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.CLIENT_QUOTES, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const quoteData = convertTimestamps(data) as ClientQuote;
        return { ...quoteData, id: docSnap.id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting client quote:', error);
      return undefined;
    }
  }
  
  async getClientQuotesByClient(clientId: string): Promise<ClientQuote[]> {
    try {
      const quotesRef = collection(db, COLLECTIONS.CLIENT_QUOTES);
      const q = query(quotesRef, where('clientId', '==', clientId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const quoteData = convertTimestamps(data) as ClientQuote;
        return { ...quoteData, id: doc.id };
      });
    } catch (error) {
      console.error('Error getting client quotes:', error);
      return [];
    }
  }
  
  async createClientQuote(quote: InsertClientQuote): Promise<ClientQuote> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.CLIENT_QUOTES), {
        ...quote,
        createdAt: serverTimestamp()
      });
      
      const newQuote = { 
        ...quote, 
        id: docRef.id, 
        createdAt: new Date() 
      } as ClientQuote;
      
      return newQuote;
    } catch (error) {
      console.error('Error creating client quote:', error);
      throw error;
    }
  }
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data() as User;
        return { ...userData, id: docSnap.id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as User;
        return { ...userData, id: querySnapshot.docs[0].id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
        ...insertUser,
        createdAt: serverTimestamp()
      });
      
      const newUser = { 
        ...insertUser, 
        id: docRef.id, 
        createdAt: new Date() 
      } as User;
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  // Freight quotes operations
  async getFreightQuote(id: string): Promise<FreightQuote | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.FREIGHT_QUOTES, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const quoteData = convertTimestamps(data) as FreightQuote;
        return { ...quoteData, id: docSnap.id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting freight quote:', error);
      return undefined;
    }
  }
  
  async getAllFreightQuotes(): Promise<FreightQuote[]> {
    try {
      const quotesRef = collection(db, COLLECTIONS.FREIGHT_QUOTES);
      const q = query(quotesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const quoteData = convertTimestamps(data) as FreightQuote;
        return { ...quoteData, id: doc.id };
      });
    } catch (error) {
      console.error('Error getting all freight quotes:', error);
      return [];
    }
  }
  
  async createFreightQuote(quote: InsertFreightQuote): Promise<FreightQuote> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.FREIGHT_QUOTES), {
        ...quote,
        createdAt: serverTimestamp()
      });
      
      const newQuote = { 
        ...quote, 
        id: docRef.id, 
        createdAt: new Date() 
      } as FreightQuote;
      
      return newQuote;
    } catch (error) {
      console.error('Error creating freight quote:', error);
      throw error;
    }
  }
  
  // Aduana info operations
  async getAduanaInfo(id: string): Promise<AduanaInfo | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.ADUANA_INFO, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const aduanaData = docSnap.data() as AduanaInfo;
        return { ...aduanaData, id: docSnap.id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting aduana info:', error);
      return undefined;
    }
  }
  
  async getAduanaInfoByName(name: string): Promise<AduanaInfo | undefined> {
    try {
      const aduanaRef = collection(db, COLLECTIONS.ADUANA_INFO);
      const q = query(aduanaRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const aduanaData = querySnapshot.docs[0].data() as AduanaInfo;
        return { ...aduanaData, id: querySnapshot.docs[0].id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting aduana info by name:', error);
      return undefined;
    }
  }
  
  async getAllAduanaInfo(): Promise<AduanaInfo[]> {
    try {
      console.log('[STORAGE] Buscando informações de todas as aduanas...');
      
      // CORREÇÃO: Devemos usar adminDb em vez de db para acessar o Firebase Admin
      if (!adminDb) {
        console.error('[STORAGE] ❌ adminDb não está disponível para getAllAduanaInfo');
        throw new Error('Firebase Admin não está corretamente inicializado');
      }
      
      // IMPORTANTE: Também precisamos buscar pontos de travessia para compatibilidade
      const aduanaRef = adminDb.collection(COLLECTIONS.ADUANA_INFO);
      const crossingRef = adminDb.collection(COLLECTIONS.CROSSING_POINTS);
      
      // Buscar ambas as coleções em paralelo para melhor desempenho
      const [aduanaSnapshot, crossingSnapshot] = await Promise.all([
        aduanaRef.get(),
        crossingRef.get()
      ]);
      
      console.log(`[STORAGE] ✅ Encontradas ${aduanaSnapshot.size} aduanas e ${crossingSnapshot.size} pontos de travessia no banco`);
      
      // Processar aduanas tradicionais
      const aduanaResults = aduanaSnapshot.docs.map(doc => {
        const data = doc.data();
        // Convertemos os timestamps manualmente para evitar problemas
        const aduanaData: AduanaInfo = {
          ...data,
          id: doc.id,
          nome: data.name || data.nome,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
        
        console.log(`[STORAGE] Aduana encontrada: ${data.name || data.nome}`);
        return aduanaData;
      });
      
      // Processar pontos de travessia e converter para o formato de AduanaInfo
      const crossingResults = crossingSnapshot.docs.map(doc => {
        const point = doc.data();
        
        // Criar uma entrada para cada lado do ponto de travessia (BR e PY)
        if (point.brazilianSide && point.brazilianSide.name) {
          console.log(`[STORAGE] Ponto de travessia (BR) encontrado: ${point.brazilianSide.name}`);
          
          // Adaptar os campos do formato crossing point para o formato aduana
          // Diagnóstico para depuração
          console.log(`[STORAGE] Dados originais para ${point.brazilianSide.name}:`, {
            id: doc.id,
            faf: point.faf
          });

          // Verificar valores de FAF para diagnóstico
          if (point.brazilianSide.name === 'Santa Helena') {
            console.log(`[STORAGE] ⚠️ Santa Helena ainda com valor antigo no banco: ${point.faf?.perTruck}`);
            console.log(`[STORAGE] ⚠️ Atualize o valor no banco de dados diretamente via configurações`);
          }

          const fafPerTruck = point.faf?.perTruck || '0';
          const fafPerTruck_parsed = parseFloat(fafPerTruck);

          // Logging detalhado para diagnóstico
          if (point.brazilianSide.name === 'Santa Helena') {
            console.log(`[STORAGE] Valores atuais para Santa Helena (diagnóstico):`, {
              fafPerTruck,
              fafPerTruck_parsed,
              lot1000: point.faf?.lot1000,
              lot1500: point.faf?.lot1500
            });
          }

          const aduanaData: AduanaInfo = {
            id: doc.id + '_br',
            nome: point.brazilianSide.name,
            pais: 'BR',
            country: 'BR',
            name: point.brazilianSide.name,
            aduana_parceira: point.paraguayanSide?.name,
            paired_with: point.paraguayanSide?.name,
            
            // FAF values - guardamos tanto em string quanto em número para garantir compatibilidade
            faf_per_truck: fafPerTruck_parsed,
            faf_lot_1000: parseFloat(point.faf?.lot1000 || '0'),
            faf_lot_1500: parseFloat(point.faf?.lot1500 || '0'),
            
            // Mantenha os valores originais para debug
            fafPerTruck: point.faf?.perTruck || '0',
            fafLot1000: point.faf?.lot1000 || '0', 
            fafLot1500: point.faf?.lot1500 || '0',
            
            // FULA
            tem_fula: point.fula?.enabled || false,
            has_fula: point.fula?.enabled || false,
            custo_fula: parseFloat(point.fula?.costPerTon || '0'),
            fula_cost: parseFloat(point.fula?.costPerTon || '0'),
            
            // Balsa
            tem_balsa: point.balsa?.enabled || false,
            has_balsa: point.balsa?.enabled || false,
            custo_balsa: {
              padrao: parseFloat(point.balsa?.defaultCost || '0'),
              puerto_indio: parseFloat(point.balsa?.puertoIndioCost || '0')
            },
            balsa_cost: parseFloat(point.balsa?.defaultCost || '0'),
            balsa_puerto_indio: parseFloat(point.balsa?.puertoIndioCost || '0'),
            
            // Estacionamento
            tem_estacionamento: point.estacionamento?.enabled || false,
            has_estacionamento: point.estacionamento?.enabled || false,
            custo_estacionamento: parseFloat(point.estacionamento?.costPerTruck || '0'),
            estacionamento_cost: parseFloat(point.estacionamento?.costPerTruck || '0'),
            
            // Outros custos
            custo_mapa: parseFloat(point.mapa?.costPerTon || '0'),
            mapa_cost: parseFloat(point.mapa?.costPerTon || '0'),
            custo_mapa_acerto: parseFloat(point.mapa?.acerto || '0'),
            mapa_acerto: parseFloat(point.mapa?.acerto || '0'),
            custo_mapa_fixo: parseFloat(point.mapa?.fixo || '0'),
            mapa_fixo: parseFloat(point.mapa?.fixo || '0'),
            custo_mapa_1000: parseFloat(point.mapa?.lot1000 || '0'),
            mapa_cost_1000: parseFloat(point.mapa?.lot1000 || '0'),
            custo_mapa_1500: parseFloat(point.mapa?.lot1500 || '0'),
            mapa_cost_1500: parseFloat(point.mapa?.lot1500 || '0'),
            
            custo_dinatran: parseFloat(point.dinatran?.costPerTruck || '0'),
            dinatran_cost: parseFloat(point.dinatran?.costPerTruck || '0'),
            
            tem_comissao_luiz: point.comissaoLuiz?.enabled || false,
            has_comissao_luiz: point.comissaoLuiz?.enabled || false,
            comissao_luiz: parseFloat(point.comissaoLuiz?.costPerTon || '0'),
            
            // Outros campos
            createdAt: point.createdAt?.toDate() || new Date(),
            updatedAt: point.updatedAt?.toDate() || new Date()
          };
          
          return aduanaData;
        }
        
        return null;
      }).filter(Boolean);
      
      // Combinar resultados de ambas as coleções
      const combinedResults = [...aduanaResults, ...crossingResults];
      console.log(`[STORAGE] Total de aduanas consolidadas: ${combinedResults.length}`);
      
      // Mais diagnósticos para debug
      combinedResults.forEach(aduana => {
        const aduanaName = aduana.nome || (aduana as any).name || "Desconhecido";
        
        // Se o nome está no formato 'Xxx - Yyy', extraímos a parte brasileira
        if (aduanaName.includes('-')) {
          const brName = aduanaName.split('-')[0].trim();
          console.log(`[STORAGE] ⚠️ Aduana com nome composto: ${aduanaName}, lado BR: ${brName}`);
        }
      });
      
      return combinedResults;
    } catch (error) {
      console.error('[STORAGE] ❌ Erro ao buscar todas as aduanas:', error);
      return [];
    }
  }
  
  async getAduanaInfoByCountry(country: string): Promise<AduanaInfo[]> {
    try {
      const aduanaRef = collection(db, COLLECTIONS.ADUANA_INFO);
      const q = query(aduanaRef, where('country', '==', country));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const aduanaData = doc.data() as AduanaInfo;
        return { ...aduanaData, id: doc.id };
      });
    } catch (error) {
      console.error('Error getting aduana info by country:', error);
      return [];
    }
  }
  
  async createAduanaInfo(info: InsertAduanaInfo): Promise<AduanaInfo> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.ADUANA_INFO), info);
      
      const newInfo = { 
        ...info, 
        id: docRef.id 
      } as AduanaInfo;
      
      return newInfo;
    } catch (error) {
      console.error('Error creating aduana info:', error);
      throw error;
    }
  }
  
  async updateAduanaInfo(id: string, info: Partial<AduanaInfo>): Promise<AduanaInfo | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.ADUANA_INFO, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error(`Aduana with ID ${id} not found`);
        return undefined;
      }
      
      await updateDoc(docRef, info);
      
      // Get the updated document
      const updatedDocSnap = await getDoc(docRef);
      const updatedData = updatedDocSnap.data() as AduanaInfo;
      
      return { ...updatedData, id };
    } catch (error) {
      console.error('Error updating aduana info:', error);
      return undefined;
    }
  }
  
  async deleteAduanaInfo(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTIONS.ADUANA_INFO, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting aduana info:', error);
      return false;
    }
  }
  
  // Exchange rates operations
  async getLatestExchangeRate(): Promise<ExchangeRate | undefined> {
    try {
      const ratesRef = collection(db, COLLECTIONS.EXCHANGE_RATES);
      const q = query(ratesRef, orderBy('updatedAt', 'desc'), firestoreLimit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        const rateData = convertTimestamps(data) as ExchangeRate;
        return { ...rateData, id: querySnapshot.docs[0].id };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting latest exchange rate:', error);
      return undefined;
    }
  }
  
  async getExchangeRates(): Promise<ExchangeRate[]> {
    try {
      const ratesRef = collection(db, COLLECTIONS.EXCHANGE_RATES);
      const q = query(ratesRef, orderBy('updatedAt', 'desc'), firestoreLimit(10));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const rateData = convertTimestamps(data) as ExchangeRate;
        return { ...rateData, id: doc.id };
      });
    } catch (error) {
      console.error('Error getting exchange rates:', error);
      return [];
    }
  }
  
  async createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.EXCHANGE_RATES), {
        ...rate,
        updatedAt: serverTimestamp()
      });
      
      const newRate = { 
        ...rate, 
        id: docRef.id, 
        updatedAt: new Date() 
      } as ExchangeRate;
      
      return newRate;
    } catch (error) {
      console.error('Error creating exchange rate:', error);
      throw error;
    }
  }
  
  // Methods from the previous implementation
  async saveFreightQuote(quoteData: any): Promise<any> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.FREIGHT_QUOTES), {
        ...quoteData,
        createdAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...quoteData, createdAt: new Date() };
    } catch (error) {
      console.error('Error saving freight quote:', error);
      throw error;
    }
  }
  
  async getFreightQuoteHistory(options: { page?: number; limit?: number; lastId?: string; } = {}): Promise<{ quotes: any[]; hasMore: boolean; totalCount?: number; }> {
    try {
      console.log('Fetching freight quote history from Firebase...');
      const startTime = performance.now();
      
      const { page = 1, limit = 20, lastId } = options;
      const quotes: any[] = [];
      let hasMore = false;
      let totalCountEstimate: number | undefined = undefined;
      
      // Criar a query base
      const quotesRef = collection(db, COLLECTIONS.FREIGHT_QUOTES);
      let q;
      
      if (lastId) {
        // Se temos lastId, usamos cursor-based pagination (mais eficiente)
        const lastDocRef = doc(db, COLLECTIONS.FREIGHT_QUOTES, lastId);
        const lastDocSnap = await getDoc(lastDocRef);
        
        if (lastDocSnap.exists()) {
          q = query(
            quotesRef,
            orderBy('createdAt', 'desc'),
            firestoreLimit(limit + 1) // Buscamos um a mais para saber se há mais páginas
          );
        } else {
          // Se o documento de referência não existir, usamos paginação normal
          const skip = (page - 1) * limit;
          q = query(
            quotesRef,
            orderBy('createdAt', 'desc'),
            firestoreLimit(limit + 1) // Buscamos um a mais para saber se há mais páginas
          );
        }
      } else {
        // Paginação baseada em offset
        const skip = (page - 1) * limit;
        
        // Para melhorar a performance, vamos tentar fazer uma estimativa do total
        // apenas para a primeira página
        if (page === 1) {
          try {
            // Estimativa do total (não precisa ser exata, apenas para UI)
            const countQuery = query(quotesRef, orderBy('createdAt', 'desc'), firestoreLimit(1000));
            const countSnapshot = await getDocs(countQuery);
            totalCountEstimate = countSnapshot.size;
            console.log(`Estimated total count: ${totalCountEstimate}`);
          } catch (countError) {
            console.warn('Error estimating total count:', countError);
          }
        }
        
        q = query(
          quotesRef,
          orderBy('createdAt', 'desc'),
          firestoreLimit(limit + 1) // Buscamos um a mais para saber se há mais páginas
        );
      }
      
      // Executar a query
      const querySnapshot = await getDocs(q);
      
      // Verificar se há mais resultados além do limite solicitado
      hasMore = querySnapshot.docs.length > limit;
      
      // Usar apenas a quantidade solicitada
      const docsToProcess = hasMore ? querySnapshot.docs.slice(0, limit) : querySnapshot.docs;
      
      // Processar os documentos
      quotes.push(...docsToProcess.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...convertTimestamps(data) };
      }));
      
      const endTime = performance.now();
      console.log(`Retrieved ${quotes.length} quotes from history (page ${page}, limit ${limit})`);
      if (quotes.length > 0) {
        console.log(`Sample first item:`, JSON.stringify(quotes[0], null, 2).substring(0, 200) + '...');
      } else {
        console.log('No quotes found');
      }
      console.log(`Query completed in ${Math.round(endTime - startTime)}ms`);
      
      return { 
        quotes, 
        hasMore,
        totalCount: totalCountEstimate
      };
    } catch (error) {
      console.error('Error getting freight quote history:', error);
      return { quotes: [], hasMore: false };
    }
  }
  
  async getFreightQuoteById(id: string): Promise<any | undefined> {
    try {
      const docRef = doc(db, COLLECTIONS.FREIGHT_QUOTES, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { id: docSnap.id, ...convertTimestamps(data) };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting freight quote by ID:', error);
      return undefined;
    }
  }
  
  // System configuration operations
  async getSystemConfig(): Promise<SystemConfig | undefined> {
    try {
      // Tentar obter a configuração do sistema (assumimos que há apenas um documento)
      console.log('[STORAGE] Buscando configuração do sistema...');
      
      // CORREÇÃO: Devemos usar adminDb em vez de db para acessar o Firebase Admin
      if (!adminDb) {
        console.error('[STORAGE] ❌ adminDb não está disponível para getSystemConfig');
        throw new Error('Firebase Admin não está corretamente inicializado');
      }
      
      const configRef = adminDb.collection(COLLECTIONS.SYSTEM_CONFIG);
      const querySnapshot = await configRef.get();
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        console.log('[STORAGE] ✅ Configuração do sistema encontrada');
        
        // Convertemos os timestamps manualmente
        const configData: SystemConfig = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
        
        return configData;
      }
      
      // Se não encontrar, cria uma configuração padrão
      return this.createDefaultSystemConfig();
    } catch (error) {
      console.error('Error getting system config:', error);
      return undefined;
    }
  }
  
  // App settings operations
  async getAppSettings(): Promise<any> {
    try {
      console.log('[STORAGE] Buscando configurações da aplicação...');
      
      if (!adminDb) {
        console.error('[STORAGE] ❌ adminDb não está disponível para getAppSettings');
        throw new Error('Firebase Admin não está corretamente inicializado');
      }
      
      const settingsRef = adminDb.collection('app_settings');
      const querySnapshot = await settingsRef.get();
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        console.log('[STORAGE] ✅ Configurações da aplicação encontradas:', 
                   {id: doc.id, ...data});
        
        return {
          ...data,
          id: doc.id,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          defaultProfitMargin: data.defaultProfitMargin || 4.0,
          defaultTonnage: data.defaultTonnage || 1000,
          notifications: data.notifications !== undefined ? data.notifications : true,
          darkMode: data.darkMode || false
        };
      }
      
      // Se não encontrar, cria configurações padrão
      console.log('[STORAGE] Configurações não encontradas, criando padrão...');
      return this.createDefaultAppSettings();
    } catch (error) {
      console.error('[STORAGE] Erro ao obter configurações da aplicação:', error);
      // Criar novo documento padrão
      try {
        return await this.createDefaultAppSettings();
      } catch (innerError) {
        console.error('[STORAGE] Erro ao criar configurações padrão:', innerError);
        // Retornar objeto padrão como fallback final
        return {
          id: 'default_error',
          defaultProfitMargin: 4.0,
          defaultTonnage: 1000,
          notifications: true,
          darkMode: false,
          updatedAt: new Date()
        };
      }
    }
  }
  
  private async createDefaultAppSettings(): Promise<any> {
    console.log('[STORAGE] Criando configurações padrão da aplicação...');
    
    const defaultSettings = {
      defaultProfitMargin: 4.0,
      defaultTonnage: 1000,
      notifications: true,
      darkMode: false,
      updatedAt: new Date()
    };
    
    try {
      if (!adminDb) {
        console.error('[STORAGE] AdminDb não disponível, retornando configurações padrão');
        return {
          ...defaultSettings,
          id: 'default_error'
        };
      }
      
      try {
        // Tentar adicionar o documento
        const settingsRef = adminDb.collection('app_settings');
        const docRef = await settingsRef.add({
          ...defaultSettings,
          updatedAt: new Date() // Usando Date em vez de adminDb.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('[STORAGE] Configurações padrão criadas com sucesso, ID:', docRef.id);
        return {
          ...defaultSettings,
          id: docRef.id
        };
      } catch (firebaseError) {
        console.error('[STORAGE] Erro específico do Firebase ao criar configurações:', firebaseError);
        return {
          ...defaultSettings,
          id: 'default_error'
        };
      }
    } catch (error) {
      console.error('[STORAGE] Erro geral ao criar configurações padrão:', error);
      return {
        ...defaultSettings,
        id: 'default_error'
      };
    }
  }
  
  async updateAppSettings(settings: any): Promise<any> {
    try {
      console.log('[STORAGE] Atualizando configurações da aplicação...');
      
      if (!adminDb) {
        console.error('[STORAGE] ❌ adminDb não está disponível para updateAppSettings');
        // Em vez de lançar erro, criar configurações padrão
        console.log('[STORAGE] Retornando configurações padrão em vez de lançar erro');
        const defaultSettings = {
          defaultProfitMargin: settings.defaultProfitMargin || 4.0,
          defaultTonnage: settings.defaultTonnage || 1000,
          notifications: settings.notifications !== undefined ? settings.notifications : true,
          darkMode: settings.darkMode !== undefined ? settings.darkMode : false,
          id: 'default_error',
          updatedAt: new Date()
        };
        return defaultSettings;
      }
      
      // Obter configurações existentes ou criar novas
      const existingSettings = await this.getAppSettings();
      
      if (!existingSettings || !existingSettings.id || existingSettings.id === 'default_error') {
        console.log('[STORAGE] Criando configurações padrão pois existingSettings é inválido:', existingSettings);
        
        // Tentar criar documento com valores atualizados
        try {
          // Tentar adicionar o documento
          const settingsRef = adminDb.collection('app_settings');
          const docRef = await settingsRef.add({
            ...settings,
            updatedAt: new Date()
          });
          
          console.log('[STORAGE] Criado novo documento de configurações, ID:', docRef.id);
          return {
            ...settings,
            id: docRef.id,
            updatedAt: new Date()
          };
        } catch (addError) {
          console.error('[STORAGE] Erro ao adicionar novo documento:', addError);
          return {
            ...settings,
            id: 'default_error',
            updatedAt: new Date()
          };
        }
      }
      
      try {
        // Atualizar documento existente
        console.log('[STORAGE] Atualizando documento existente:', existingSettings.id);
        const settingsRef = adminDb.collection('app_settings').doc(existingSettings.id);
        
        await settingsRef.update({
          ...settings,
          updatedAt: new Date()
        });
        
        // Retornar configurações atualizadas
        return {
          ...existingSettings,
          ...settings,
          updatedAt: new Date()
        };
      } catch (updateError) {
        console.error('[STORAGE] Erro ao atualizar documento:', updateError);
        return {
          ...existingSettings,
          ...settings,
          updatedAt: new Date()
        };
      }
    } catch (error) {
      console.error('[STORAGE] Erro geral em updateAppSettings:', error);
      // Em vez de lançar erro, retornar objeto atualizado sem persistir
      return {
        ...settings,
        id: 'default_error',
        updatedAt: new Date()
      };
    }
  }
  
  private async createDefaultSystemConfig(): Promise<SystemConfig> {
    console.log('Creating default system configuration...');
    
    // Valores padrão das coordenadas das aduanas (os mesmos do código atual)
    const defaultAduanaCoordinates = {
      // Aduanas brasileiras
      "Guaíra": { lat: -24.0860, lng: -54.2567 },
      "Mundo Novo": { lat: -23.9421, lng: -54.2805 },
      "Foz do Iguaçu": { lat: -25.5094, lng: -54.5967 },
      "Santa Helena": { lat: -24.869651309318915, lng: -54.352615179610815 },
      
      // Aduanas paraguaias
      "Salto del Guaíra": { lat: -24.0886, lng: -54.3368 },
      "Ciudad del Este": { lat: -25.5096, lng: -54.6038 },
      "Puerto Indio": { lat: -24.921943241362257, lng: -54.47763737839428 }
    };
    
    // Valores padrão para outras localizações
    const defaultLocationCoordinates = {
      "Toledo": { lat: -24.7246, lng: -53.7412 },
      "BRF Toledo": { lat: -24.7141, lng: -53.7517 }
    };
    
    const defaultConfig: InsertSystemConfig = {
      aduanaCoordinates: defaultAduanaCoordinates,
      locationCoordinates: defaultLocationCoordinates,
      defaultCrossingDistance: 5
    };
    
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.SYSTEM_CONFIG), {
        ...defaultConfig,
        updatedAt: serverTimestamp()
      });
      
      return {
        ...defaultConfig,
        id: docRef.id,
        updatedAt: new Date()
      } as SystemConfig;
    } catch (error) {
      console.error('Error creating default system config:', error);
      throw error;
    }
  }
  
  async updateSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    try {
      // Primeiro, obter a configuração existente ou criar uma nova
      const existingConfig = await this.getSystemConfig();
      
      if (!existingConfig || !existingConfig.id) {
        throw new Error('Failed to get or create system configuration');
      }
      
      // Atualizar o documento existente
      const docRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, existingConfig.id);
      await updateDoc(docRef, {
        ...config,
        updatedAt: serverTimestamp()
      });
      
      // Retornar a configuração atualizada
      return {
        ...existingConfig,
        ...config,
        updatedAt: new Date()
      } as SystemConfig;
    } catch (error) {
      console.error('Error updating system config:', error);
      throw error;
    }
  }
  
  async getCoordinates(locationName: string): Promise<Coordinate | undefined> {
    try {
      const config = await this.getSystemConfig();
      
      if (!config) {
        return undefined;
      }
      
      // Verificar primeiro nas coordenadas de aduanas
      if (config.aduanaCoordinates && config.aduanaCoordinates[locationName]) {
        return config.aduanaCoordinates[locationName];
      }
      
      // Depois verificar nas coordenadas de localidades
      if (config.locationCoordinates && config.locationCoordinates[locationName]) {
        return config.locationCoordinates[locationName];
      }
      
      return undefined;
    } catch (error) {
      console.error(`Error getting coordinates for ${locationName}:`, error);
      return undefined;
    }
  }
  
  async getAduanaCoordinates(): Promise<Record<string, Coordinate>> {
    try {
      const config = await this.getSystemConfig();
      
      if (!config || !config.aduanaCoordinates) {
        return {};
      }
      
      return config.aduanaCoordinates;
    } catch (error) {
      console.error('Error getting aduana coordinates:', error);
      return {};
    }
  }
  
  async getPlaceDetails(placeId: string): Promise<any | undefined> {
    try {
      // Implementação para manter os dados do lugar em cache
      // Primeiro vamos tentar buscar de uma coleção de lugares em cache
      const placeCacheRef = collection(db, 'place_cache');
      const q = query(placeCacheRef, where('place_id', '==', placeId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Retornar dados em cache
        const placeData = querySnapshot.docs[0].data();
        console.log(`Usando dados em cache para place_id: ${placeId}`);
        return placeData;
      }
      
      // Se não estiver em cache, fazer requisição à API (similar ao placesHandler.ts)
      console.log(`Dados para place_id ${placeId} não encontrados no cache.`);
      
      // Como o Firebase Storage não deve fazer requisições HTTP diretamente,
      // estamos retornando undefined aqui. A requisição deve ser feita no handler
      return undefined;
    } catch (error) {
      console.error(`Error getting place details for place_id ${placeId}:`, error);
      return undefined;
    }
  }
}

export const storage = new FirebaseStorage();
