/**
 * ML Handler para recomendação de preços
 * Integra o serviço de ML Python com o backend Node.js
 * 
 * Implementa aprendizado contínuo do modelo:
 * - Treina o modelo inicialmente se não existir
 * - Mantém um contador de novas cotações para retrinar periodicamente
 * - Retrinar o modelo quando houver novas cotações suficientes
 */

import { Request, Response } from 'express';
import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { adminDb, db } from '../firebase';
import { logger } from '../utils/production-logger';

// Caminhos para os scripts Python
const ML_SERVICE_DIR = path.join(process.cwd(), 'ml_service');
const TRAIN_SCRIPT = path.join(ML_SERVICE_DIR, 'train.py');
const PREDICT_SCRIPT = path.join(ML_SERVICE_DIR, 'predict.py');

// Controle de aprendizado contínuo
let newQuotesCount = 0;
const RETRAINING_THRESHOLD = 1; // Reduzido para 1 para garantir treinamento a cada nova cotação
const AUTO_TRAIN_ENABLED = true; // Habilitar treinamento automático

// Caminho para script de teste de predições
const TEST_PREDICTIONS_SCRIPT = path.join(ML_SERVICE_DIR, 'test_predictions.py');

// Interfaces para tipos de dados
interface TrainingResult {
  success: boolean;
  metrics?: {
    r2: number;
    rmse: number;
    mse: number;
  };
  modelInfo?: {
    model_type: string;
    version: string;
    created_at: string;
  };
  error?: string;
}

// Estado do modelo de ML e suas amostras
interface ModelMetrics {
  r2?: number;
  rmse?: number;
  mae?: number;
  pct_diff?: number;
  feature_importance?: Record<string, number>;
}

interface ModelState {
  samplesCount: number;
  newSamplesCount: number;
  lastTrainingDate: string | null;
  feedbackCount: number;
  retrainingThreshold: number;
  trained?: boolean;
  model_type?: string;
  metrics?: ModelMetrics;
  featureImportance?: Record<string, number>;
}

interface PredictionResult {
  success: boolean;
  recommendedPrice?: number;
  rawPrediction?: number;
  similarityMethod?: string;  // Novo campo: método usado para encontrar similaridade
  historicalWeight?: number;  // Novo campo: peso dos dados históricos  
  referenceCalculation?: {
    baseRate: number;
    distanceComponent: number;
    estimatedTotal: number;
    difference: {
      absolute: number;
      percentage: number;
    }
  };
  modelInfo?: {
    model_type: string;
    metrics: {
      r2: number;
      rmse: number;
      mae?: number;
      cv_rmse?: number;
    };
    training_date: string;
    version: string;
    sample_count?: number;
    topFeatures?: Array<{name: string; importance: number}>;
  };
  error?: string;
}

/**
 * Executa um script Python e retorna a saída como JSON
 * @param scriptPath Caminho do script Python
 * @param args Argumentos para o script
 * @param inputData Dados de entrada para enviar via stdin (opcional)
 * @returns Promise com o resultado em formato JSON
 */
export function runPythonScript(scriptPath: string, args: string[] = [], inputData?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Verificar se o script existe
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script não encontrado: ${scriptPath}`));
      return;
    }

    // Comando para executar o script
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    
    let outputData = '';
    let errorData = '';
    
    // Capturar saída padrão
    pythonProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      outputData += chunk;
    });

    // Capturar saída de erro
    pythonProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorData += chunk;
    });

    // Enviar dados de entrada, se fornecidos
    if (inputData) {
      try {
        // Garantir que os dados sejam enviados como JSON válido
        const inputJson = JSON.stringify(inputData);
        pythonProcess.stdin.write(inputJson);
        pythonProcess.stdin.end();
      } catch (err) {
        reject(new Error(`Erro ao serializar dados de entrada: ${err instanceof Error ? err.message : String(err)}`));
        pythonProcess.kill();
        return;
      }
    }

    // Resolver a Promise quando o processo terminar
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        logger.error(`[ML Python] Processo encerrado com código ${code}`);
        logger.error(`[ML Python] Erro: ${errorData}`);
        
        // Tentar extrair informações de erro do output
        try {
          // Verificar se a saída contém JSON
          const jsonMatch = outputData.match(/({[\s\S]*})/);
          if (jsonMatch) {
            const jsonError = JSON.parse(jsonMatch[1]);
            reject(jsonError);
          } else {
            reject(new Error(`Erro ao executar script Python: ${errorData || 'Código de saída não-zero'}`));
          }
        } catch (err) {
          reject(new Error(`Erro ao executar script Python: ${errorData || 'Código de saída não-zero'}`));
        }
        return;
      }

      // Tentar extrair JSON da saída
      try {
        // Procurar o JSON na última linha da saída
        const lines = outputData.split('\n').filter(line => line.trim() !== '');
        const lastLine = lines[lines.length - 1];
        
        // Verificar se a última linha parece ser um JSON
        if (lastLine && (lastLine.startsWith('{') || lastLine.startsWith('['))) {
          try {
            // Tentar analisar como JSON
            const jsonData = JSON.parse(lastLine);
            logger.log('[ML Python] JSON encontrado e processado com sucesso na última linha');
            resolve(jsonData);
            return;
          } catch (jsonError) {
            logger.error('[ML Python] A última linha parece JSON mas não é válida:', lastLine);
            logger.error('[ML Python] Erro de análise JSON:', jsonError);
            // Continuar com a abordagem de regex como fallback
          }
        }
        
        // Método alternativo: procurar por um padrão JSON válido em toda a saída
        logger.log('[ML Python] Tentando extrair JSON com regex');
        const jsonRegex = /{[\s\S]*}/g;
        const matches = outputData.match(jsonRegex);
        
        if (!matches || matches.length === 0) {
          logger.error('[ML Python] Nenhum JSON encontrado na saída. Saída completa:', outputData);
          reject(new Error('Nenhum dado JSON encontrado na saída do script'));
          return;
        }
        
        // Usar o último match (caso haja múltiplos objetos JSON na saída)
        const lastJsonString = matches[matches.length - 1];
        
        // Tentar analisar com tratamento de erro mais detalhado
        try {
          const jsonData = JSON.parse(lastJsonString);
          
          // Log para debug
          logger.log('[ML Python] JSON extraído com sucesso');
          
          resolve(jsonData);
        } catch (error) {
          logger.error('[ML Python] Erro ao analisar JSON:', error);
          logger.error('[ML Python] Saída bruta:', outputData);
          reject(new Error(`Falha ao processar saída do script: ${error instanceof Error ? error.message : String(error)}`));
        }
      } catch (finalError) {
        logger.error('[ML Python] Erro final ao processar saída:', finalError);
        reject(new Error(`Erro ao processar saída do script: ${finalError}`));
      }
    });
  });
}

/**
 * Handler para recomendar preço de frete com base em ML
 * Utiliza modelo treinado com dados reais para recomendar pagamento ao motorista
 */
export const recommendFreightPriceHandler = async (req: Request, res: Response) => {
  try {
    // Receber dados para predição - garantir que é um objeto válido
    let predictionData;
    try {
      // Log do corpo da requisição para debug
      logger.log('[ML Handler] Corpo da requisição bruto:', JSON.stringify(req.body));
      
      // Verificar se já é um objeto ou se precisa ser parseado de JSON
      if (typeof req.body === 'string') {
        predictionData = JSON.parse(req.body);
      } else if (req.body.body && typeof req.body.body === 'string') {
        // Caso especial onde o Express coloca o corpo dentro de body
        predictionData = JSON.parse(req.body.body);
      } else {
        predictionData = req.body;
      }
    } catch (err) {
      logger.error('[ML Handler] Erro ao processar dados de entrada:', err);
      return res.status(400).json({
        success: false,
        error: 'Formato de dados inválido. Envie um JSON válido.'
      });
    }
    
    logger.log('[ML Handler] Dados processados para predição:', JSON.stringify(predictionData));

    // Validar dados mínimos necessários
    if (!predictionData.totalDistance) {
      return res.status(400).json({
        success: false,
        error: 'Dados insuficientes. É necessário informar ao menos a distância total.'
      });
    }
    
    // Garantir que apenas o profitMargin não influencia na recomendação
    // Importante: A tonnage DEVE influenciar a recomendação, por isso não a zeramos mais
    predictionData.profitMargin = 0;
    // NÃO zeraremos mais a tonelagem (tonnage) pois ela é essencial para o cálculo
    // O modelo ML deve considerar a tonelagem para predições mais precisas

    // Verificar pasta de modelos
    const modelDir = path.join(ML_SERVICE_DIR, 'models');
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
      logger.log('[ML Handler] Diretório de modelos criado:', modelDir);
    }

    // Verificar se existem dados CSV para treinamento
    // Verificar primeiro o CSV com coordenadas geográficas
    const csvPath = path.join(process.cwd(), 'attached_assets', 'Libro3_utf8.csv');
    let csvExists = fs.existsSync(csvPath);
    
    if (csvExists) {
      logger.log('[ML Handler] Dados de CSV com coordenadas encontrados:', csvPath);
    } else {
      // Fallback para o CSV tradicional
      const oldCsvPath = path.join(process.cwd(), 'attached_assets', 'Libro2.csv');
      csvExists = fs.existsSync(oldCsvPath);
      
      if (csvExists) {
        logger.log('[ML Handler] Dados de CSV encontrados (formato antigo):', oldCsvPath);
      } else {
        logger.log('[ML Handler] Arquivo CSV não encontrado. Buscando em locais alternativos...');
        // Verificar em outros locais possíveis
        const altPaths = [
          path.join(process.cwd(), 'Libro3_utf8.csv'),
          path.join(process.cwd(), 'Libro2.csv'),
          path.join(ML_SERVICE_DIR, 'Libro3_utf8.csv'),
          path.join(ML_SERVICE_DIR, 'Libro2.csv')
        ];
        
        for (const altPath of altPaths) {
          if (fs.existsSync(altPath)) {
            logger.log('[ML Handler] Arquivo CSV encontrado em local alternativo:', altPath);
            break;
          }
        }
      }
    }

    // Verificar se temos algum modelo treinado
    const modelFiles = fs.existsSync(modelDir) ? 
      fs.readdirSync(modelDir).filter(f => f.endsWith('.pkl')) : [];
    
    const modelExists = modelFiles.length > 0;
    
    if (!modelExists) {
      logger.log('[ML Handler] Nenhum modelo treinado encontrado. Iniciando treinamento inicial...');
      
      // Tentar executar treinamento inicial
      try {
        // Executar script de treinamento de forma síncrona
        const output = execSync(`python ${TRAIN_SCRIPT}`, { encoding: 'utf8' });
        logger.log('[ML Handler] Treinamento inicial concluído');
      } catch (error) {
        logger.error('[ML Handler] Erro no treinamento inicial:', error);
        return res.status(500).json({
          success: false,
          error: 'Não foi possível treinar um modelo. Verifique se o arquivo CSV com dados históricos está disponível.'
        });
      }
    }

    // Determinar o tipo de modelo a usar
    // Tentar usar GradientBoosting para melhor captura de padrões sazonais
    const useAdvancedModel = true; // sempre tentar usar o modelo avançado primeiro
    const modelType = useAdvancedModel ? 'gb' : 'rf';
    
    // Adicionar informações do mês atual se não fornecidas
    // Isso é importante para capturar sazonalidade
    if (!predictionData.month) {
      const now = new Date();
      predictionData.month = now.getMonth() + 1; // 1-12
      predictionData.quarter = Math.floor(predictionData.month / 3) + 1; // 1-4
      logger.log('[ML Handler] Adicionando mês atual:', predictionData.month);
    }

    // Processamento de data para extrair informações sazonais se disponível
    if (predictionData.date) {
      try {
        const dateObj = new Date(predictionData.date);
        predictionData.month = dateObj.getMonth() + 1; // 1-12
        predictionData.quarter = Math.floor(predictionData.month / 3) + 1; // 1-4
        logger.log(`[ML Handler] Extraindo dados sazonais da data ${predictionData.date}: Mês=${predictionData.month}, Trimestre=${predictionData.quarter}`);
      } catch (err) {
        logger.warn(`[ML Handler] Erro ao processar data ${predictionData.date}, usando data atual:`, err);
        // Em caso de erro, usamos a data atual como fallback
        const now = new Date();
        predictionData.month = now.getMonth() + 1;
        predictionData.quarter = Math.floor(predictionData.month / 3) + 1;
      }
    }

    // Verificar se temos coordenadas de origem e destino na requisição
    // Loggar os dados de coordenadas para debug
    // Padronizar campos de coordenadas: o frontend pode enviar destLat/destLng ou destinationLat/destinationLng
    // Vamos normalizar para usar o formato que o ML espera (originLat/originLng e destLat/destLng)
    
    // Se temos o formato destinationLat/destinationLng mas não o formato destLat/destLng
    if (predictionData.destinationLat !== undefined && predictionData.destLat === undefined) {
      predictionData.destLat = predictionData.destinationLat;
      predictionData.destLng = predictionData.destinationLng;
      logger.log('[ML Handler] Usando formato alternativo de coordenadas (destination -> dest)');
    }
    
    logger.log('[ML Handler] Verificando coordenadas:', {
      originLat: predictionData.originLat,
      originLng: predictionData.originLng,
      destLat: predictionData.destLat || predictionData.destinationLat,
      destLng: predictionData.destLng || predictionData.destinationLng,
      hasOriginCoords: typeof predictionData.originLat !== 'undefined' && typeof predictionData.originLng !== 'undefined',
      hasDestCoords: (typeof predictionData.destLat !== 'undefined' && typeof predictionData.destLng !== 'undefined') ||
                    (typeof predictionData.destinationLat !== 'undefined' && typeof predictionData.destinationLng !== 'undefined')
    });
    
    // Tentar converter valores para números - tanto para o formato dest quanto para destination
    if (predictionData.originLat) {
      predictionData.originLat = typeof predictionData.originLat === 'string' ? parseFloat(predictionData.originLat) : predictionData.originLat;
    }
    if (predictionData.originLng) {
      predictionData.originLng = typeof predictionData.originLng === 'string' ? parseFloat(predictionData.originLng) : predictionData.originLng;
    }
    
    // Primeiro verificar e converter destLat/destLng
    if (predictionData.destLat) {
      predictionData.destLat = typeof predictionData.destLat === 'string' ? parseFloat(predictionData.destLat) : predictionData.destLat;
    }
    if (predictionData.destLng) {
      predictionData.destLng = typeof predictionData.destLng === 'string' ? parseFloat(predictionData.destLng) : predictionData.destLng;
    }
    
    // Se não temos destLat/destLng mas temos destinationLat/destinationLng, usar estes
    if (predictionData.destLat === undefined && predictionData.destinationLat) {
      predictionData.destLat = typeof predictionData.destinationLat === 'string' ? 
                             parseFloat(predictionData.destinationLat) : predictionData.destinationLat;
      
      predictionData.destLng = typeof predictionData.destinationLng === 'string' ? 
                             parseFloat(predictionData.destinationLng) : predictionData.destinationLng;
                             
      logger.log('[ML Handler] Coordenadas de destino normalizadas:', predictionData.destLat, predictionData.destLng);
    }
    
    // Caso não tenhamos, tentamos obter do contexto da requisição que pode vir das coordenadas da aduana
    if (!predictionData.originLat && !predictionData.originLng && req.query.originLat && req.query.originLng) {
      predictionData.originLat = parseFloat(req.query.originLat as string);
      predictionData.originLng = parseFloat(req.query.originLng as string);
      logger.log(`[ML Handler] Adicionando coordenadas de origem da query: ${predictionData.originLat}, ${predictionData.originLng}`);
    }
    
    if (!predictionData.destLat && !predictionData.destLng && req.query.destinationLat && req.query.destinationLng) {
      predictionData.destLat = parseFloat(req.query.destinationLat as string);
      predictionData.destLng = parseFloat(req.query.destinationLng as string);
      logger.log(`[ML Handler] Adicionando coordenadas de destino da query: ${predictionData.destLat}, ${predictionData.destLng}`);
    }
    
    // Executar script de predição com o modelo escolhido
    logger.log(`[ML Handler] Executando script de predição com modelo ${modelType}...`);
    predictionData.model_type = modelType; // passar o tipo como parâmetro
    
    // Log completo dos dados que serão enviados ao ML para debug
    logger.log(`[ML Handler] DADOS COMPLETOS PARA ML:`, JSON.stringify(predictionData, null, 2));
    
    // Cria um arquivo temporário para passar os dados para o script Python
    const tempJsonFile = path.join(os.tmpdir(), `predict_data_${Date.now()}.json`);
    fs.writeFileSync(tempJsonFile, JSON.stringify(predictionData));
    
    // Passa o arquivo como argumento em vez de enviar via stdin
    const result = await runPythonScript(PREDICT_SCRIPT, [tempJsonFile, modelType]) as PredictionResult;
    
    // Remove o arquivo temporário
    try {
      fs.unlinkSync(tempJsonFile);
    } catch (err) {
      logger.warn(`[ML Handler] Não foi possível remover arquivo temporário ${tempJsonFile}:`, err);
    }
    
    // Verificar sucesso
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erro desconhecido na predição'
      });
    }
    
    // Adicionar informações extras ao resultado
    const enhancedResult = {
      ...result,
      // Metadados específicos para o cliente
      meta: {
        source: 'Modelo treinado com dados reais de fretes',
        recommendation_date: new Date().toISOString(),
        distance: predictionData.totalDistance,
        month: predictionData.month,
        similarityMethod: result.similarityMethod || predictionData.similarity_method || 'distance_similar',
        historicalWeight: result.historicalWeight || predictionData.historical_weight || 0.8,
        coordinates: {
          origin: predictionData.originLat && predictionData.originLng ? 
            { lat: predictionData.originLat, lng: predictionData.originLng } : null,
          destination: predictionData.destLat && predictionData.destLng ? 
            { lat: predictionData.destLat, lng: predictionData.destLng } : null
        }
      }
    };
    
    logger.log('[ML Handler] Recomendação gerada com sucesso:', 
      result.recommendedPrice ? `R$ ${result.recommendedPrice}` : 'N/A');
    
    // Retornar resultado
    res.status(200).json(enhancedResult);
  } catch (error) {
    logger.error('[ML Handler] Erro ao processar recomendação:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no servidor'
    });
  }
};

/**
 * Função para notificar o sistema que uma nova cotação foi salva
 * Isso permite ao sistema de ML aprender com os novos dados
 */
export const notifyNewQuote = async (quoteData: any) => {
  try {
    // Incrementar contador de novas cotações
    newQuotesCount++;
    logger.log(`[ML] Nova cotação registrada. Total acumulado: ${newQuotesCount}`);
    
    // Verificar se temos dados necessários para o ML
    if (!quoteData.driverPayment || !quoteData.totalDistance || !quoteData.tonnage) {
      logger.log('[ML] Cotação não possui todos os dados necessários para o modelo.');
      return;
    }
    
    // Verificar se já atingimos o limiar para retreinar
    if (newQuotesCount >= RETRAINING_THRESHOLD) {
      logger.log(`[ML] Atingido limiar de ${RETRAINING_THRESHOLD} novas cotações. Iniciando retreinamento...`);
      
      // Chamar retreinamento de forma assíncrona (não bloqueia a thread principal)
      setTimeout(async () => {
        try {
          await runPythonScript(TRAIN_SCRIPT);
          logger.log('[ML] Modelo retreinado com sucesso com os novos dados!');
          
          // Resetar contador após treinar
          newQuotesCount = 0;
        } catch (error) {
          logger.error('[ML] Erro ao retreinar modelo:', error);
        }
      }, 0);
    }
  } catch (error) {
    logger.error('[ML] Erro ao processar nova cotação:', error);
  }
};

/**
 * Handler para treinar o modelo de ML
 * Esta função pode ser chamada manualmente, por um job agendado,
 * ou automaticamente quando alcançar um número de novas cotações
 */
export const trainModelHandler = async (req: Request, res: Response) => {
  try {
    logger.log('[ML Handler] Iniciando treinamento do modelo...');

    // Sempre forçar o treinamento quando solicitado pela API
    const forceTraining = true; // Modificado para sempre treinar o modelo
    
    try {
      // Verificar quantas cotações existem no Firestore
      const quotesRef = adminDb.collection('freight_quotes');
      const quotesSnapshot = await quotesRef.get();
      const quotesCount = quotesSnapshot.size;
      
      logger.log(`[ML Handler] Total de cotações disponíveis: ${quotesCount}`);
      
      // Log informativo apenas - continuamos com o treinamento independentemente
      if (quotesCount < 3) {
        logger.warn('[ML Handler] Aviso: Poucos dados disponíveis para treinamento.');
      }
    } catch (error) {
      logger.error('[ML Handler] Erro ao verificar cotações:', error);
      // Continuar mesmo com erro na verificação
    }

    // Executar script de treinamento
    const result = await runPythonScript(TRAIN_SCRIPT) as TrainingResult;
    
    logger.log('[ML Handler] Resultado do treinamento:', JSON.stringify(result));
    
    // Resetar contador após treinar com sucesso
    newQuotesCount = 0;
    
    // Retornar resultado
    res.status(200).json({
      success: true,
      message: 'Modelo treinado com sucesso',
      metrics: result.metrics,
      modelInfo: result.modelInfo
    });
  } catch (error) {
    logger.error('[ML Handler] Erro ao treinar modelo:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no servidor'
    });
  }
};

/**
 * Handler para registrar feedback do usuário sobre recomendação
 * Isso ajudará a melhorar o modelo com o tempo coletando dados sobre a precisão das predições
 */
export const savePredictionFeedbackHandler = async (req: Request, res: Response) => {
  try {
    const { 
      originalRecommendation, 
      userSuggestedPrice, 
      isHelpful,
      metadata 
    } = req.body;
    
    logger.log('[ML Handler] Recebendo feedback:', JSON.stringify(req.body, null, 2));
    
    // Validar dados recebidos
    if (originalRecommendation === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Dados insuficientes para registrar feedback (recomendação original é obrigatória)'
      });
    }
    
    // Preparar os dados para salvar
    const feedbackData = {
      originalRecommendation,
      userSuggestedPrice: userSuggestedPrice || null,
      isHelpful,
      metadata: metadata || {},
      createdAt: new Date().toISOString()
    };
    
    // Salvar feedback no Firestore para uso futuro no treinamento
    await adminDb.collection('ml_feedback').add(feedbackData);
    
    logger.log('[ML Handler] Feedback salvo com sucesso');
    
    // Sempre incrementar o contador de feedback, seja positivo ou negativo
    logger.log('[ML Handler] Incrementando contador de feedback');
    
    // Incrementar contador para induzir retreinamento futuro
    newQuotesCount++;
    
    logger.log(`[ML Handler] Contador de novas amostras para retreinamento: ${newQuotesCount}/${RETRAINING_THRESHOLD}`);
    
    // Se o usuário sugeriu um preço alternativo, usá-lo no treinamento
    if (userSuggestedPrice) {
      logger.log('[ML Handler] Feedback contém valor sugerido: será usado para treinamento futuro');
      
      // Adicionar esse feedback como uma nova "amostra" para o ML
      try {
        // Criar um documento no formato de cotação de frete para o ML poder usar
        const sampleData = {
          driverPayment: userSuggestedPrice,
          totalDistance: metadata?.distance || 0,
          tonnage: metadata?.tonnage || 1000,
          originCity: metadata?.originCity || '',
          destinationCity: metadata?.destinationCity || '',
          createdAt: new Date().toISOString(),
          // Marcar claramente como feedback para que saibamos que é originado de uma sugestão do usuário
          isFromFeedback: true,
          productType: metadata?.productType || 'grains'
        };
        
        // Salvar na coleção de dados de treinamento
        await adminDb.collection('ml_training_samples').add(sampleData);
        logger.log('[ML Handler] ✅ Feedback adicionado ao conjunto de dados de treinamento');
      } catch (error) {
        logger.error('[ML Handler] ❌ Erro ao adicionar feedback ao conjunto de treinamento:', error);
      }
    } else if (isHelpful === false) {
      // Se o usuário marcou como não útil, mas não sugeriu um valor, ainda registramos isso
      logger.log('[ML Handler] Feedback negativo sem sugestão de preço: registrando como amostra de treinamento com flag especial');
      
      try {
        // Criar um documento que marca esta recomendação como ineficaz
        const sampleData = {
          originalRecommendation: originalRecommendation,
          wasRejected: true,
          totalDistance: metadata?.distance || 0,
          originCity: metadata?.originCity || '',
          destinationCity: metadata?.destinationCity || '',
          createdAt: new Date().toISOString(),
          isFromFeedback: true,
          isNegativeFeedback: true, // Marcador especial para feedback negativo sem sugestão
          productType: metadata?.productType || 'grains'
        };
        
        // Salvar na coleção de feedback para análise futura
        await adminDb.collection('ml_feedback_negative').add(sampleData);
        logger.log('[ML Handler] ✅ Feedback negativo registrado para análise futura');
      } catch (error) {
        logger.error('[ML Handler] ❌ Erro ao registrar feedback negativo:', error);
      }
    }
      
    // Se atingiu o limite, agendar retreinamento
    if (AUTO_TRAIN_ENABLED && newQuotesCount >= RETRAINING_THRESHOLD) {
      logger.log('[ML Handler] ⚠️ Limiar atingido! Agendando retreinamento do modelo com base em feedbacks');
      
      // Disparar um treinamento assíncrono aqui
      setTimeout(async () => {
        try {
          logger.log('[ML Handler] Iniciando retreinamento automático com novos feedbacks...');
          await runPythonScript(TRAIN_SCRIPT);
          logger.log('[ML Handler] ✅ Modelo retreinado com sucesso incluindo feedbacks!');
          
          // Resetar contador após treinar
          newQuotesCount = 0;
        } catch (error) {
          logger.error('[ML Handler] ❌ Erro no retreinamento automático:', error);
        }
      }, 0);
    }
    
    res.status(200).json({
      success: true,
      message: 'Feedback registrado com sucesso'
    });
  } catch (error) {
    logger.error('[ML Handler] Erro ao salvar feedback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no servidor'
    });
  }
};

/**
 * Handler para obter o estado atual do modelo ML e contagem de amostras
 * Isso permite ao frontend mostrar informações sobre o conjunto de dados
 */
export const getModelStateHandler = async (req: Request, res: Response) => {
  try {
    logger.log('[ML Handler] Obtendo estado do modelo e contagem de amostras...');
    
    // Obter quantidade de amostras disponíveis no Firestore
    let samplesCount = 0;
    let feedbackCount = 0;
    let lastTrainingDate: string | null = null;
    let modelFiles: string[] = [];
    const modelDir = path.join(ML_SERVICE_DIR, 'models');
    
    try {
      // Contagem de cotações
      const quotesRef = adminDb.collection('freight_quotes');
      const quotesSnapshot = await quotesRef.get();
      samplesCount = quotesSnapshot.size;
      
      // Contagem de amostras de treinamento (incluindo feedbacks)
      const samplesRef = adminDb.collection('ml_training_samples');
      const samplesSnapshot = await samplesRef.get();
      
      if (samplesSnapshot.size > 0) {
        samplesCount += samplesSnapshot.size;
        
        // Contar quantos são de feedback
        feedbackCount = samplesSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.isFromFeedback === true;
        }).length;
      }
      
      // Verificar última data de treinamento
      // Essa informação pode estar em um arquivo específico ou no último modelo salvo
      if (fs.existsSync(modelDir)) {
        modelFiles = fs.readdirSync(modelDir).filter(f => f.endsWith('.pkl'));
        
        if (modelFiles.length > 0) {
          // Usar estatísticas do arquivo para obter a data
          const newestModel = modelFiles
            .map(file => ({ file, mtime: fs.statSync(path.join(modelDir, file)).mtime }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];
            
          if (newestModel) {
            lastTrainingDate = newestModel.mtime.toISOString();
          }
        }
      }
    } catch (error) {
      logger.error('[ML Handler] Erro ao obter estatísticas:', error);
    }
    
    // Preparar o objeto de estado
    const modelState: ModelState = {
      samplesCount,
      newSamplesCount: newQuotesCount,
      lastTrainingDate,
      feedbackCount,
      retrainingThreshold: RETRAINING_THRESHOLD,
      trained: modelFiles.length > 0,
      model_type: modelFiles.length > 0 ? 
        (modelFiles[0].startsWith('gb_') ? 'GradientBoosting' : 
         modelFiles[0].startsWith('rf_') ? 'RandomForest' : 'Unknown') 
        : 'None'
    };
    
    // Tentar encontrar metadados do modelo para incluir métricas
    try {
      if (fs.existsSync(modelDir)) {
        const metadataFiles = fs.readdirSync(modelDir)
          .filter(f => f.endsWith('_metadata.json'))
          .sort((a, b) => {
            // Ordenar por data de modificação (mais recente primeiro)
            const statA = fs.statSync(path.join(modelDir, a));
            const statB = fs.statSync(path.join(modelDir, b));
            return statB.mtime.getTime() - statA.mtime.getTime();
          });
        
        if (metadataFiles.length > 0) {
          const latestMetadataPath = path.join(modelDir, metadataFiles[0]);
          const metadataContent = fs.readFileSync(latestMetadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          
          if (metadata && metadata.metrics) {
            modelState.metrics = metadata.metrics;
            
            if (metadata.metrics.feature_importance) {
              modelState.featureImportance = metadata.metrics.feature_importance;
            }
          }
        }
      }
    } catch (error) {
      logger.error('[ML Handler] Erro ao obter metadados do modelo:', error);
    }
    
    logger.log('[ML Handler] Estado do modelo:', modelState);
    
    // Retornar estatísticas
    res.status(200).json({
      success: true,
      modelState
    });
  } catch (error) {
    logger.error('[ML Handler] Erro ao obter estado do modelo:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no servidor'
    });
  }
};