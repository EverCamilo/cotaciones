import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { calculateFreight } from "./handlers/freightCalculationHandler";
import { getExchangeRates } from "./handlers/exchangeRatesHandler";
import { calculateDistance } from "./handlers/distanceHandler";
import { searchPlaces, getPlaceDetails } from "./handlers/placesHandler";
import { recommendAduana } from "./handlers/aduanaRecommendationHandler";
// Importamos apenas o sistema de carregamento inicial, não o de sincronização
import { addWebSocketClient } from "./firebase/syncManager";
import { loadInitialData } from "./firebase/initialLoad";
// Importar rotas dos pontos de travessia
import apiRoutes from "./routes/index";
// Importar handler de configurações da aplicação
import { getAppSettings, updateAppSettings } from "./handlers/appSettingsHandler";
// Importar ML handlers
import { 
  recommendFreightPriceHandler, 
  trainModelHandler, 
  notifyNewQuote,
  savePredictionFeedbackHandler,
  getModelStateHandler,
  runPythonScript
} from "./handlers/mlHandler";
import { testPredictionsHandler } from "./handlers/mlTestHandler";
import { runSimulationHandler } from "./handlers/mlSimulationHandler";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Registrar rotas da API organizadas
  app.use('/api', apiRoutes);
  // API routes for freight calculator
  app.post('/api/freight/calculate', calculateFreight);
  
  // Aduana recommendation endpoint
  app.get('/api/freight/recommend-aduana', recommendAduana);
  
  // Save a quote
  app.post('/api/freight/save', async (req, res) => {
    try {
      const quoteData = req.body;
      const savedQuote = await storage.saveFreightQuote(quoteData);
      
      // Notificar o sistema ML de uma nova cotação para aprendizado contínuo
      try {
        await notifyNewQuote(savedQuote);
      } catch (mlError) {
        console.warn('Erro ao notificar ML de nova cotação:', mlError);
        // Não falhar a requisição principal por causa do ML
      }
      
      res.status(201).json(savedQuote);
    } catch (error) {
      console.error('Error saving quote:', error);
      res.status(500).json({ 
        message: 'Failed to save quote', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Client API routes
  // Busca sempre direta do Firebase, sem usar cache
  app.get('/api/clients', async (req, res) => {
    try {
      // Buscar sempre do Firebase, sem usar cache
      console.log('Buscando clientes diretamente do Firebase');
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ 
        message: 'Failed to fetch clients', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  app.get('/api/clients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      res.json(client);
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({ 
        message: 'Failed to fetch client', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  app.post('/api/clients', async (req, res) => {
    try {
      const clientData = req.body;
      
      // Verificar se já existe um cliente com o mesmo nome
      const existingClient = await storage.getClientByName(clientData.name);
      if (existingClient) {
        return res.status(200).json(existingClient); // Retornamos o existente em vez de criar um novo
      }
      
      const newClient = await storage.createClient(clientData);
      res.status(201).json(newClient);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ 
        message: 'Failed to create client', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Get freight quote history - sempre busca dados direto do Firebase, com suporte a paginação
  app.get('/api/freight/history', async (req, res) => {
    try {
      // Extrair parâmetros de paginação da query
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const lastId = req.query.lastId as string || undefined;
      
      console.log(`Buscando cotações com paginação: página ${page}, limite ${limit}${lastId ? `, último ID: ${lastId}` : ''}`);
      
      // Buscar sempre do Firebase, sem usar cache
      const result = await storage.getFreightQuoteHistory({ page, limit, lastId });
      
      // Retornar resultados com metadados de paginação
      res.json({
        quotes: result.quotes || [],
        pagination: {
          hasMore: result.hasMore,
          currentPage: page,
          totalEstimate: result.totalCount,
          pageSize: limit
        }
      });
    } catch (error) {
      console.error('Error retrieving quote history:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve history', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // API para obter cotações de frete - sempre busca direto do Firebase, com suporte a paginação
  app.get('/api/freight_quotes', async (req, res) => {
    try {
      // Extrair parâmetros de paginação da query
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const lastId = req.query.lastId as string || undefined;
      
      console.log(`Buscando cotações com paginação: página ${page}, limite ${limit}${lastId ? `, último ID: ${lastId}` : ''}`);
      
      // Buscar sempre diretamente do Firebase, sem cache
      const result = await storage.getFreightQuoteHistory({ page, limit, lastId });
      
      // Retornar resultados com metadados de paginação
      res.json({
        quotes: result.quotes || [],
        pagination: {
          hasMore: result.hasMore,
          currentPage: page,
          totalEstimate: result.totalCount,
          pageSize: limit
        }
      });
    } catch (error) {
      console.error('Error retrieving freight quotes:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve freight quotes', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Get a specific freight quote by ID
  app.get('/api/freight/:id', async (req, res) => {
    try {
      const id = req.params.id;
      
      const quote = await storage.getFreightQuoteById(id);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      res.json(quote);
    } catch (error) {
      console.error('Error retrieving quote:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve quote', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Exchange rates API
  app.get('/api/exchange-rates', getExchangeRates);
  
  // API para obter as taxas de câmbio - sempre busca direto do Firebase
  app.get('/api/exchange_rates', async (req, res) => {
    try {
      // Buscar sempre diretamente do Firebase, sem cache
      console.log('Buscando taxas de câmbio diretamente do Firebase');
      const rates = await storage.getExchangeRates();
      
      // Não atualizar o cache para forçar consulta direta sempre
      
      res.json(rates || []);
    } catch (error) {
      console.error('Error retrieving exchange rates:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve exchange rates', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Distance calculation API
  app.post('/api/distance/calculate', calculateDistance);
  
  // Places API
  app.get('/api/places/search', searchPlaces);
  app.get('/api/places/details', getPlaceDetails);
  
  // Places Cache API (para acesso direto do storage)
  app.get('/api/places/cache/:placeId', async (req, res) => {
    try {
      const placeId = req.params.placeId;
      const placeDetails = await storage.getPlaceDetails(placeId);
      
      if (!placeDetails) {
        return res.status(404).json({ 
          message: `Place details not found for ID: ${placeId}` 
        });
      }
      
      res.json(placeDetails);
    } catch (error) {
      console.error(`Error retrieving place details for ${req.params.placeId}:`, error);
      res.status(500).json({ 
        message: 'Failed to retrieve place details', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // API routes for aduana info
  app.get('/api/aduanas', async (req, res) => {
    try {
      const aduanas = await storage.getAllAduanaInfo();
      res.json(aduanas);
    } catch (error) {
      console.error('Error retrieving aduanas:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve aduanas', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Add a new aduana to the database
  app.post('/api/aduanas', async (req, res) => {
    try {
      const aduanaData = req.body;
      const newAduana = await storage.createAduanaInfo(aduanaData);
      res.status(201).json(newAduana);
    } catch (error) {
      console.error('Error creating aduana:', error);
      res.status(500).json({ 
        message: 'Failed to create aduana', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Update an existing aduana
  app.put('/api/aduanas/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const aduanaData = req.body;
      const updatedAduana = await storage.updateAduanaInfo(id, aduanaData);
      
      if (!updatedAduana) {
        return res.status(404).json({ message: 'Aduana not found' });
      }
      
      res.json(updatedAduana);
    } catch (error) {
      console.error('Error updating aduana:', error);
      res.status(500).json({ 
        message: 'Failed to update aduana', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  app.get('/api/aduanas/country/:country', async (req, res) => {
    try {
      const country = req.params.country;
      const aduanas = await storage.getAduanaInfoByCountry(country);
      res.json(aduanas);
    } catch (error) {
      console.error('Error retrieving aduanas by country:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve aduanas', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  app.get('/api/aduanas/name/:name', async (req, res) => {
    try {
      const name = req.params.name;
      const aduana = await storage.getAduanaInfoByName(name);
      
      if (!aduana) {
        return res.status(404).json({ message: 'Aduana not found' });
      }
      
      res.json(aduana);
    } catch (error) {
      console.error('Error retrieving aduana by name:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve aduana', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // API routes for system configuration
  app.get('/api/system-config', async (req, res) => {
    try {
      const config = await storage.getSystemConfig();
      res.json(config);
    } catch (error) {
      console.error('Error retrieving system configuration:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve system configuration', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.patch('/api/system-config', async (req, res) => {
    try {
      const configData = req.body;
      const updatedConfig = await storage.updateSystemConfig(configData);
      res.json(updatedConfig);
    } catch (error) {
      console.error('Error updating system configuration:', error);
      res.status(500).json({ 
        message: 'Failed to update system configuration', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Rota para obter configurações da aplicação
  app.get('/api/app-settings', getAppSettings);
  
  // Rota para atualizar configurações da aplicação
  app.patch('/api/app-settings', updateAppSettings);
  
  // Rotas de Machine Learning (ML)
  app.post('/api/ml/recommend-freight-price', recommendFreightPriceHandler);
  app.post('/api/ml/train-model', trainModelHandler);
  app.post('/api/ml/feedback', savePredictionFeedbackHandler);
  app.get('/api/ml/state', getModelStateHandler);
  app.post('/api/ml/test-predictions', testPredictionsHandler);
  app.post('/api/ml/simulate', runSimulationHandler);
  
  // Rota para gerar dados iniciais e treinar modelo (forçado)
  app.post('/api/ml/initialize', async (req, res) => {
    try {
      console.log('[ML] Iniciando geração de dados iniciais e treinamento forçado...');
      
      // Forçar treinamento mesmo com poucos dados
      const result = await runPythonScript(path.join(process.cwd(), 'ml_service/train.py'), ['--force']);
      
      console.log('[ML] Inicialização concluída:', result);
      
      res.status(200).json({
        success: true,
        message: 'Sistema ML inicializado com sucesso',
        result
      });
    } catch (error) {
      console.error('[ML] Erro ao inicializar o sistema ML:', error);
      res.status(500).json({ 
        success: false,
        message: 'Falha ao inicializar o sistema ML', 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });
  
  // Comentário: a função runPythonScript foi importada no topo do arquivo

  // API routes for coordinate management
  app.get('/api/coordinates/:name', async (req, res) => {
    try {
      const name = req.params.name;
      const coordinates = await storage.getCoordinates(name);
      
      if (!coordinates) {
        return res.status(404).json({ 
          message: `Coordinates not found for location: ${name}` 
        });
      }
      
      res.json(coordinates);
    } catch (error) {
      console.error(`Error retrieving coordinates for ${req.params.name}:`, error);
      res.status(500).json({ 
        message: 'Failed to retrieve coordinates', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get('/api/aduana-coordinates', async (req, res) => {
    try {
      const coordinates = await storage.getAduanaCoordinates();
      res.json(coordinates);
    } catch (error) {
      console.error('Error retrieving aduana coordinates:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve aduana coordinates', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  const httpServer = createServer(app);
  
  // Configurar servidor WebSocket para atualizações em tempo real com configurações melhoradas
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    // Aumentar o tempo de espera do ping para evitar desconexões prematuras
    clientTracking: true,
    // Necessário para replicações como o Replit
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Outros parâmetros opcionais
      concurrencyLimit: 10, // Limitar concorrência para evitar uso excessivo de CPU
      threshold: 1024 // Limitar para mensagens maiores que 1KB
    }
  });
  
  // Monitoramento de clientes do WebSocket com retry e melhor tratamento de erros
  const pingInterval = setInterval(() => {
    let activeConnections = 0;
    let terminatedConnections = 0;
    
    wss.clients.forEach((ws) => {
      // Verificar se o cliente está marcado como inativo
      if ((ws as any).isAlive === false) {
        // Verificar se já excedeu o máximo de falhas de ping
        if ((ws as any).pingFailCount >= 3) {
          console.log('Desconectando cliente WebSocket que não respondeu a múltiplos pings');
          try {
            ws.terminate();
            terminatedConnections++;
          } catch (e) {
            console.error('Erro ao terminar conexão WebSocket inativa:', e);
          }
          return;
        } else {
          // Incrementar contador de falhas e tentar novamente
          (ws as any).pingFailCount = ((ws as any).pingFailCount || 0) + 1;
          console.log(`Cliente WebSocket não respondeu ao ping. Tentativa ${(ws as any).pingFailCount}/3`);
        }
      } else {
        activeConnections++;
      }
      
      // Marcar como inativo para verificar na próxima iteração
      (ws as any).isAlive = false;
      
      // Enviar ping com tratamento de erro robusto
      try {
        ws.ping('heartbeat');
      } catch (e) {
        console.error('Erro ao enviar ping para cliente WebSocket:', e);
        // Não terminar imediatamente, aguardar próxima verificação
        (ws as any).pingFailCount = ((ws as any).pingFailCount || 0) + 1;
      }
    });
    
    // Log de status das conexões a cada verificação
    if (wss.clients.size > 0) {
      console.log(`Status WebSocket: ${activeConnections} conexões ativas, ${terminatedConnections} terminadas, ${wss.clients.size} total`);
    }
  }, 20000); // verificar a cada 20 segundos para manter conexões mais estáveis
  
  // Limpar intervalo quando o servidor fechar
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  // Gerenciar conexões WebSocket com validação e tratamento de erros melhorado
  wss.on('connection', (ws, req) => {
    // Identificação da conexão para debug
    const connectionId = Math.random().toString(36).substring(2, 10);
    const clientIp = req.socket.remoteAddress || 'endereço desconhecido';
    
    console.log(`Cliente WebSocket conectado [ID: ${connectionId}] de ${clientIp}`);
    
    // Inicializar propriedades do cliente
    (ws as any).isAlive = true;
    (ws as any).pingFailCount = 0;
    (ws as any).connectionId = connectionId;
    (ws as any).clientIp = clientIp;
    (ws as any).connectionTime = Date.now();
    
    // Função para verificar se o WebSocket ainda está em condições de receber mensagens
    const canSendMessage = () => {
      return ws.readyState === 1; // 1 = OPEN no protocolo WebSocket
    };
    
    // Função segura para enviar mensagens
    const safeSend = (data: any) => {
      if (!canSendMessage()) {
        console.warn(`[WS:${connectionId}] Tentativa de enviar mensagem para cliente desconectado`);
        return false;
      }
      
      try {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
      } catch (e) {
        console.error(`[WS:${connectionId}] Erro ao enviar mensagem:`, e);
        return false;
      }
    };
    
    // Responder a pings para manter a conexão viva
    ws.on('pong', () => {
      // Resetar o contador de falhas de ping quando receber pong
      (ws as any).isAlive = true;
      (ws as any).pingFailCount = 0;
      // Debug detalhado apenas ocasionalmente para evitar spam de logs
      if (Math.random() < 0.1) { // 10% de chance de logar 
        console.log(`[WS:${connectionId}] Recebido pong do cliente`);
      }
    });
    
    // Configurar timeout de conexão para evitar conexões penduradas
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === 0) { // 0 = CONNECTING no protocolo WebSocket
        console.warn(`[WS:${connectionId}] Timeout na negociação WebSocket após 30 segundos`);
        try {
          ws.terminate();
        } catch (err) {
          console.error(`[WS:${connectionId}] Erro ao encerrar conexão em timeout:`, err);
        }
      }
    }, 30000);
    
    // Adicionar cliente ao gerenciador de sincronização com verificação de erro
    try {
      addWebSocketClient(ws);
    } catch (err) {
      console.error(`[WS:${connectionId}] Erro ao adicionar cliente ao gerenciador:`, err);
    }
    
    // Tratar mensagens do cliente
    ws.on('message', (message) => {
      try {
        // Exemplo de processamento de mensagem (ping/pong para manter conexão ativa)
        const data = JSON.parse(message.toString());
        
        if (data.type === 'ping') {
          safeSend({ 
            type: 'pong', 
            timestamp: Date.now(),
            connectionId // Devolver ID de conexão para debug no cliente
          });
        }
      } catch (error) {
        console.error(`[WS:${connectionId}] Erro ao processar mensagem WebSocket:`, error);
      }
    });
    
    // Tratar erros na conexão
    ws.on('error', (error) => {
      console.error(`[WS:${connectionId}] Erro na conexão WebSocket:`, error);
      
      // Em caso de erro, tentar fechar a conexão para liberar recursos
      try {
        ws.terminate();
      } catch (terminateError) {
        console.error(`[WS:${connectionId}] Erro ao terminar conexão após erro:`, terminateError);
      }
    });
    
    // Tratar desconexão com mais informações para diagnóstico
    ws.on('close', (code, reason) => {
      // Limpar timeout de conexão se existir
      clearTimeout(connectionTimeout);
      
      // Calcular tempo que a conexão esteve ativa
      const connectionDuration = Math.round((Date.now() - (ws as any).connectionTime) / 1000);
      
      console.log(`[WS:${connectionId}] Cliente WebSocket desconectado após ${connectionDuration}s. Código: ${code}, Razão: ${reason || ''}`);
      
      // Diagnóstico adicional para códigos de erro específicos
      if (code === 1006) {
        // Em vez de registrar como aviso (warn), tratamos como info porque é comum e esperado no Replit
        console.log(`[WS:${connectionId}] Código 1006 detectado - normal em ambiente Replit`);
      } else if (code === 1001) {
        console.log(`[WS:${connectionId}] Código 1001 indica que o cliente fechou normalmente a conexão`);
      }
    });
    
    // Enviar mensagem de confirmação inicial com dados de conexão
    safeSend({ 
      type: 'connected', 
      message: 'Conexão WebSocket estabelecida com sucesso',
      timestamp: Date.now(),
      connectionId, // Identificador único para debug
      serverTime: new Date().toISOString()
    });
  });
  
  // Não iniciar sincronização em tempo real com Firebase
  // Inicializamos manualmente os caches uma única vez em vez de usar listeners em tempo real
  console.log('Modo sem tempo real: carregando dados apenas uma vez...');
  
  // Iniciar carregamento inicial de dados (importado no topo do arquivo)
  loadInitialData().then(() => {
    console.log('Carregamento inicial de dados concluído com sucesso');
  }).catch((error: Error) => {
    console.error('Erro no carregamento inicial de dados:', error);
  });
  
  // Configurar limpeza na parada do servidor
  httpServer.on('close', () => {
    console.log('Servidor HTTP sendo encerrado...');
  });

  return httpServer;
}
