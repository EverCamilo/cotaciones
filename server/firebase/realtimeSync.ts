import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp, 
  limit, 
  DocumentSnapshot,
  DocumentChange,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

// Define collection names para sincronização em tempo real
const COLLECTIONS = {
  FREIGHT_QUOTES: 'freight_quotes',
  CLIENTS: 'clients',
  EXCHANGE_RATES: 'exchange_rates'
};

// Armazenar o último snapshot para cada coleção para evitar duplicidade de processamento
const lastSnapshots = new Map<string, Set<string>>();

export interface SyncOptions {
  onInitialData?: (data: any[]) => void;
  onUpdate?: (data: any, type: 'added' | 'modified' | 'removed') => void;
  onError?: (error: Error) => void;
  /**
   * Número máximo de documentos a serem sincronizados.
   * Limita a quantidade de dados e reduz o tráfego com o Firebase.
   * Default: 100
   */
  maxDocuments?: number;
}

/**
 * Classe para gerenciar sincronização em tempo real com o Firebase
 * Implementa padrão Singleton para evitar conexões duplicadas
 */
export class FirebaseRealtimeSync {
  private static instance: FirebaseRealtimeSync;
  private _unsubscribers: Map<string, () => void> = new Map();
  private _collectionData: Map<string, any[]> = new Map();
  
  // Construtor privado para Singleton
  private constructor() {}
  
  // Obter instância única
  public static getInstance(): FirebaseRealtimeSync {
    if (!FirebaseRealtimeSync.instance) {
      FirebaseRealtimeSync.instance = new FirebaseRealtimeSync();
    }
    return FirebaseRealtimeSync.instance;
  }
  
  /**
   * Sincroniza uma coleção do Firestore em tempo real
   * Versão melhorada para evitar conexões duplicadas e limitar o número de documentos
   * 
   * @param collectionName - Nome da coleção a ser sincronizada
   * @param options - Opções de sincronização
   * @returns Função para encerrar a sincronização
   */
  syncCollection(collectionName: string, options: SyncOptions): () => void {
    try {
      // Verificar se já existe uma sincronização para esta coleção
      if (this._unsubscribers.has(collectionName)) {
        console.log(`Reutilizando sincronização existente para ${collectionName}`);
        
        // Se já temos dados para esta coleção, enviar dados iniciais imediatamente
        if (this._collectionData.has(collectionName) && options.onInitialData) {
          const cachedData = this._collectionData.get(collectionName) || [];
          
          // Verificar se temos dados válidos no cache
          if (cachedData.length > 0) {
            console.log(`Enviando ${cachedData.length} itens de ${collectionName} do cache`);
            options.onInitialData(cachedData);
          } else {
            console.log(`Cache de ${collectionName} vazio, aguardando próxima atualização`);
          }
        }
        
        // Retornar função de cleanup que não faz nada para evitar desconectar outros usuários
        return () => {
          console.log(`Ignorando pedido de desconexão para ${collectionName} (outros clientes ainda estão usando)`);
        };
      }
      
      // Inicializar conjunto de IDs processados se não existir
      if (!lastSnapshots.has(collectionName)) {
        lastSnapshots.set(collectionName, new Set<string>());
      }
      
      // Obter limite máximo de documentos (default: 100)
      const maxDocs = options.maxDocuments || 100;
      
      // Criar consulta ordenada por data de criação (mais recentes primeiro) e limitada
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(maxDocs));
      
      console.log(`Iniciando sincronização em tempo real para ${collectionName}`);
      
      // Controlador de throttle para limitar frequência de atualizações
      let isProcessingSnapshot = false;
      let pendingSnapshot: QuerySnapshot | null = null;
      
      // Função para processar um snapshot
      const processSnapshot = (snapshot: QuerySnapshot) => {
        if (isProcessingSnapshot) {
          // Se já estamos processando um snapshot, guardar o mais recente para depois
          pendingSnapshot = snapshot;
          return;
        }
        
        isProcessingSnapshot = true;
        
        try {
          // Processar resultados e detectar mudanças
          const processedIds = lastSnapshots.get(collectionName) as Set<string>;
          const data: any[] = [];
          
          // Primeiro, processar todos os documentos atuais
          snapshot.docs.forEach((doc: DocumentSnapshot) => {
            const docData = this._convertTimestamps(doc.data());
            const item = { id: doc.id, ...docData };
            data.push(item);
            
            // Verificar se é um documento novo para notificar (apenas se tiver callback de update)
            if (!processedIds.has(doc.id) && options.onUpdate) {
              options.onUpdate(item, 'added');
              console.log(`Atualização em ${collectionName}: documento ${doc.id} foi added`);
              // Adicionar ao conjunto de processados
              processedIds.add(doc.id);
            }
          });
          
          // Atualizar dados em cache
          this._collectionData.set(collectionName, data);
          
          // Notificar sobre dados iniciais
          if (options.onInitialData) {
            options.onInitialData(data);
          }
          
          // Processar mudanças explícitas (modificações e remoções)
          snapshot.docChanges().forEach((change: DocumentChange) => {
            // Ignoramos os 'added' já tratados acima
            if (change.type !== 'added') {
              const docData = this._convertTimestamps(change.doc.data());
              const item = { id: change.doc.id, ...docData };
              
              if (options.onUpdate) {
                options.onUpdate(item, change.type as 'modified' | 'removed');
              }
              
              console.log(`Atualização em ${collectionName}: documento ${change.doc.id} foi ${change.type}`);
              
              // Se for uma remoção, remover do conjunto de processados
              if (change.type === 'removed') {
                processedIds.delete(change.doc.id);
              }
            }
          });
        } finally {
          // Marcar como não mais processando
          isProcessingSnapshot = false;
          
          // Se tivermos um snapshot pendente, processá-lo após um pequeno delay
          if (pendingSnapshot) {
            const snapshotToProcess = pendingSnapshot;
            pendingSnapshot = null;
            
            // Usar timeout para evitar chamadas recursivas profundas
            setTimeout(() => {
              processSnapshot(snapshotToProcess);
            }, 50);
          }
        }
      };
      
      // Iniciar listener único para dados iniciais e atualizações com opções
      // incluindo configuração de snapshots locais para reduzir tráfego
      const unsubscribe = onSnapshot(
        q, 
        { includeMetadataChanges: false }, // Reduz número de eventos de snapshot
        (snapshot) => {
          processSnapshot(snapshot);
        },
        (error) => {
          console.error(`Erro na sincronização para ${collectionName}:`, error);
          if (options.onError) {
            options.onError(error);
          }
        }
      );
      
      // Manter função de unsubscribe para esta coleção
      this._unsubscribers.set(collectionName, unsubscribe);
      
      return () => {
        // Encerra a sincronização quando solicitado
        if (this._unsubscribers.has(collectionName)) {
          this._unsubscribers.get(collectionName)!();
          this._unsubscribers.delete(collectionName);
          console.log(`Sincronização encerrada para ${collectionName}`);
          // Limpar dados em cache para esta coleção
          this._collectionData.delete(collectionName);
          // Limpar conjunto de IDs processados
          lastSnapshots.delete(collectionName);
        }
      };
    } catch (error) {
      console.error(`Erro ao configurar sincronização para ${collectionName}:`, error);
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
      return () => {}; // Função vazia de unsubscribe
    }
  }
  
  /**
   * Sincroniza a coleção de cotações de frete
   * @param options - Opções de sincronização
   * @returns Função para encerrar a sincronização
   */
  syncFreightQuotes(options: SyncOptions): () => void {
    return this.syncCollection(COLLECTIONS.FREIGHT_QUOTES, options);
  }
  
  /**
   * Sincroniza a coleção de clientes
   * @param options - Opções de sincronização
   * @returns Função para encerrar a sincronização
   */
  syncClients(options: SyncOptions): () => void {
    return this.syncCollection(COLLECTIONS.CLIENTS, options);
  }
  
  /**
   * Sincroniza a coleção de taxas de câmbio
   * @param options - Opções de sincronização
   * @returns Função para encerrar a sincronização
   */
  syncExchangeRates(options: SyncOptions): () => void {
    return this.syncCollection(COLLECTIONS.EXCHANGE_RATES, options);
  }
  
  /**
   * Retorna os dados em cache para uma coleção
   * @param collectionName - Nome da coleção
   * @returns Array com os dados em cache ou undefined se não houver
   */
  getCollectionData(collectionName: string): any[] | undefined {
    return this._collectionData.get(collectionName);
  }
  
  /**
   * Encerra todas as sincronizações ativas
   */
  stopAllSyncs(): void {
    this._unsubscribers.forEach((unsubscribe, collection) => {
      unsubscribe();
      console.log(`Sincronização encerrada para ${collection}`);
    });
    this._unsubscribers.clear();
    this._collectionData.clear();
    // Limpar todos os snapshots armazenados
    lastSnapshots.clear();
  }
  
  /**
   * Converte timestamps do Firestore para objetos Date
   */
  private _convertTimestamps(data: any): any {
    if (!data) return data;
    
    const result = { ...data };
    for (const key in result) {
      if (result[key] instanceof Timestamp) {
        result[key] = result[key].toDate();
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = this._convertTimestamps(result[key]);
      }
    }
    return result;
  }
}

// Exportar instância singleton
export const realtimeSync = FirebaseRealtimeSync.getInstance();