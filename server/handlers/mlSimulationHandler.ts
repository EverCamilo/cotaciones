/**
 * Handler para executar simulações de ML
 * Este handler permite testar o modelo com 100 rotas diferentes nos 12 meses do ano
 * até que o modelo atinja predições próximas aos valores históricos
 */

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { runPythonScript } from './mlHandler';

// Caminho para o script de simulação
const ML_SERVICE_DIR = path.join(process.cwd(), 'ml_service');
const SIMULATION_SCRIPT = path.join(ML_SERVICE_DIR, 'simulate_predictions.py');
const SIMULATION_RESULTS_FILE = path.join(ML_SERVICE_DIR, 'simulation_results.json');

/**
 * Handler para executar simulações de ML
 * Roda 100 rotas em 12 meses diferentes para avaliar a precisão do modelo
 */
export const runSimulationHandler = async (req: Request, res: Response) => {
  try {
    console.log('[ML Simulation] Iniciando simulação de predições...');
    
    // Verificar se o script de simulação existe
    if (!fs.existsSync(SIMULATION_SCRIPT)) {
      return res.status(404).json({
        success: false,
        error: 'Script de simulação não encontrado'
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
    
    // Obter parâmetros da solicitação
    const forceRetraining = req.query.forceRetraining === 'true';
    const iterationCount = parseInt(req.query.iterations as string) || 1;
    const targetAccuracy = parseFloat(req.query.targetAccuracy as string) || 70;
    
    console.log(`[ML Simulation] Parâmetros: forceRetraining=${forceRetraining}, iterationCount=${iterationCount}, targetAccuracy=${targetAccuracy}`);
    
    // Executar simulação
    let finalResults = null;
    let currentIteration = 0;
    let currentAccuracy = 0;
    
    do {
      currentIteration++;
      console.log(`[ML Simulation] Executando iteração ${currentIteration}/${iterationCount}...`);
      
      // Rodar script de simulação
      try {
        await runPythonScript(SIMULATION_SCRIPT);
        
        // Verificar se o arquivo de resultados foi gerado
        if (!fs.existsSync(SIMULATION_RESULTS_FILE)) {
          return res.status(500).json({
            success: false,
            error: 'Simulação concluída, mas arquivo de resultados não encontrado'
          });
        }
        
        // Ler resultados da simulação
        const resultData = fs.readFileSync(SIMULATION_RESULTS_FILE, 'utf8');
        finalResults = JSON.parse(resultData);
        
        // Atualizar precisão atual
        currentAccuracy = finalResults.acceptable_percentage || 0;
        
        console.log(`[ML Simulation] Iteração ${currentIteration} concluída com precisão de ${currentAccuracy.toFixed(1)}%`);
        
        // Se não atingimos a precisão alvo e há mais iterações, retreinar o modelo
        if (currentAccuracy < targetAccuracy && currentIteration < iterationCount) {
          console.log(`[ML Simulation] Precisão abaixo do alvo (${targetAccuracy}%). Retreinando modelo...`);
          
          // Executar script de treinamento
          const trainScript = path.join(ML_SERVICE_DIR, 'train.py');
          await runPythonScript(trainScript, ['--force']);
        }
      } catch (error) {
        console.error('[ML Simulation] Erro na iteração:', error);
        
        // Continuar para a próxima iteração mesmo com erro
        if (currentIteration < iterationCount) {
          console.log('[ML Simulation] Tentando próxima iteração...');
          continue;
        } else {
          return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao executar simulação'
          });
        }
      }
      
    } while (currentAccuracy < targetAccuracy && currentIteration < iterationCount);
    
    // Determinar o status final
    const targetReached = currentAccuracy >= targetAccuracy;
    
    // Preparar resultados para retorno
    const response = {
      success: true,
      message: targetReached 
        ? `Simulação concluída com sucesso! Precisão alvo atingida.` 
        : `Simulação concluída. Precisão alvo não atingida após ${iterationCount} iterações.`,
      iterations: currentIteration,
      targetAccuracy,
      finalAccuracy: currentAccuracy,
      targetReached,
      ...finalResults
    };
    
    // Retornar resultados
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[ML Simulation] Erro ao executar handler de simulação:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    });
  }
};