/**
 * Handler para testar predições do modelo ML em diferentes cenários
 * Este handler executa o script test_predictions.py para simular diferentes 
 * condições (mês, rotas, distâncias) e verificar a precisão das predições.
 */

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { runPythonScript } from './mlHandler';

// Caminho para o script de teste
const ML_SERVICE_DIR = path.join(process.cwd(), 'ml_service');
const TEST_SCRIPT = path.join(ML_SERVICE_DIR, 'test_predictions.py');
const TEST_RESULTS_FILE = path.join(ML_SERVICE_DIR, 'test_results.json');

interface TestScenario {
  scenario: number;
  originCity: string;
  destinationCity: string;
  totalDistance: number;
  month: number;
  historical_price: number;
  prediction: number;
  rounded_prediction: number;
  absolute_diff: number;
  percentage_diff: number;
  is_acceptable: boolean;
}

interface TestResult {
  timestamp: string;
  total_scenarios: number;
  acceptable_predictions: number;
  accuracy_rate: number;
  scenarios: TestScenario[];
}

/**
 * Handler para testar o modelo ML em diferentes cenários
 * Executa o script test_predictions.py que verifica a precisão contra dados históricos
 */
export const testPredictionsHandler = async (req: Request, res: Response) => {
  try {
    console.log('[ML Test] Iniciando testes de predição em diferentes cenários...');
    
    // Verificar se o script de teste existe
    if (!fs.existsSync(TEST_SCRIPT)) {
      return res.status(404).json({
        success: false,
        error: 'Script de testes não encontrado'
      });
    }
    
    // Verificar se temos modelos treinados
    const modelDir = path.join(ML_SERVICE_DIR, 'models');
    if (!fs.existsSync(modelDir) || fs.readdirSync(modelDir).filter(f => f.endsWith('.pkl')).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum modelo treinado encontrado. Treine o modelo primeiro.'
      });
    }
    
    // Obter parâmetros opcionais da solicitação
    const forceRetrain = req.query.forceRetrain === 'true';
    const numScenarios = parseInt(req.query.numScenarios as string) || 20;
    const acceptableErrorThreshold = parseFloat(req.query.acceptableError as string) || 15;
    
    console.log(`[ML Test] Parâmetros: forceRetrain=${forceRetrain}, numScenarios=${numScenarios}, acceptableErrorThreshold=${acceptableErrorThreshold}`);
    
    // Definir argumentos para o script Python
    const pythonArgs = [];
    if (forceRetrain) pythonArgs.push('--retrain');
    if (numScenarios) pythonArgs.push('--scenarios', numScenarios.toString());
    if (acceptableErrorThreshold) pythonArgs.push('--error-threshold', acceptableErrorThreshold.toString());
    
    // Executar script de teste
    await runPythonScript(TEST_SCRIPT, pythonArgs);
    
    // Verificar se o arquivo de resultados foi gerado
    if (!fs.existsSync(TEST_RESULTS_FILE)) {
      return res.status(500).json({
        success: false,
        error: 'Testes concluídos, mas arquivo de resultados não encontrado'
      });
    }
    
    // Ler resultados dos testes
    const resultData = fs.readFileSync(TEST_RESULTS_FILE, 'utf8');
    const testResults: TestResult = JSON.parse(resultData);
    
    // Determinar status com base na precisão
    const acceptable = testResults.accuracy_rate >= 70;
    
    // Preparar resposta mais rica
    const response = {
      success: true,
      acceptable,
      message: acceptable 
        ? `Testes concluídos com sucesso! O modelo alcançou ${testResults.accuracy_rate.toFixed(1)}% de precisão.` 
        : `Testes concluídos. O modelo alcançou apenas ${testResults.accuracy_rate.toFixed(1)}% de precisão, abaixo do ideal (70%).`,
      results: testResults
    };
    
    // Retornar resultados
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[ML Test] Erro ao executar testes:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    });
  }
};