/**
 * Rotas para gerenciamento de Pontos de Travessia (Crossing Points)
 * Esta é a nova estrutura que substituirá as aduanas individuais
 */

import { Router } from 'express';
import { storage } from '../storage';
import { CrossingPoint, insertCrossingPointSchema } from '@shared/schema';

const router = Router();

// Obter todos os pontos de travessia
router.get('/', async (req, res) => {
  try {
    console.log('[API-BACKEND] Iniciando busca de TODOS os pontos de travessia');
    const crossingPoints = await storage.getAllCrossingPoints();
    
    // DEPURAÇÃO: Verificar valores antes de enviar para o cliente
    console.log(`[API-BACKEND] Encontrados ${crossingPoints.length} pontos de travessia`);
    
    // Verificação de valores para diagnóstico apenas - sem alterações forçadas
    const santaHelena = crossingPoints.find(point => 
      point.brazilianSide.name === 'Santa Helena'
    );
    
    if (santaHelena) {
      console.log('[API-BACKEND] Valores atuais para Santa Helena (diagnóstico):', {
        fafPerTruck: santaHelena.faf.perTruck,
        fafPerTruck_parsed: parseFloat(santaHelena.faf.perTruck?.replace(/[^\d.-]/g, '') || '0'),
        lot1000: santaHelena.faf.lot1000,
        lot1500: santaHelena.faf.lot1500,
      });
    }
    
    res.json(crossingPoints);
  } catch (error) {
    console.error('Erro ao buscar pontos de travessia:', error);
    res.status(500).json({ error: 'Erro ao buscar pontos de travessia' });
  }
});

// Obter um ponto de travessia por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const crossingPoint = await storage.getCrossingPoint(id);
    
    if (!crossingPoint) {
      return res.status(404).json({ error: 'Ponto de travessia não encontrado' });
    }
    
    res.json(crossingPoint);
  } catch (error) {
    console.error(`Erro ao buscar ponto de travessia (ID: ${req.params.id}):`, error);
    res.status(500).json({ error: 'Erro ao buscar ponto de travessia' });
  }
});

// Criar um novo ponto de travessia
router.post('/', async (req, res) => {
  try {
    // Validar dados de entrada
    const parseResult = insertCrossingPointSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: parseResult.error.format() 
      });
    }
    
    // Verificar se já existe um ponto com o mesmo nome
    const existing = await storage.getCrossingPointByName(parseResult.data.name);
    if (existing) {
      return res.status(400).json({ 
        error: 'Já existe um ponto de travessia com este nome' 
      });
    }
    
    // Criar o novo ponto
    const newCrossingPoint = await storage.createCrossingPoint(parseResult.data);
    
    res.status(201).json(newCrossingPoint);
  } catch (error) {
    console.error('Erro ao criar ponto de travessia:', error);
    res.status(500).json({ error: 'Erro ao criar ponto de travessia' });
  }
});

// Atualizar um ponto de travessia
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o ponto existe
    const existing = await storage.getCrossingPoint(id);
    if (!existing) {
      return res.status(404).json({ error: 'Ponto de travessia não encontrado' });
    }
    
    // Atualizar dados
    const updatedCrossingPoint = await storage.updateCrossingPoint(id, req.body);
    
    res.json(updatedCrossingPoint);
  } catch (error) {
    console.error(`Erro ao atualizar ponto de travessia (ID: ${req.params.id}):`, error);
    res.status(500).json({ error: 'Erro ao atualizar ponto de travessia' });
  }
});

// Excluir um ponto de travessia
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o ponto existe
    const existing = await storage.getCrossingPoint(id);
    if (!existing) {
      return res.status(404).json({ error: 'Ponto de travessia não encontrado' });
    }
    
    // Excluir o ponto
    const success = await storage.deleteCrossingPoint(id);
    
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ error: 'Erro ao excluir ponto de travessia' });
    }
  } catch (error) {
    console.error(`Erro ao excluir ponto de travessia (ID: ${req.params.id}):`, error);
    res.status(500).json({ error: 'Erro ao excluir ponto de travessia' });
  }
});

export default router;