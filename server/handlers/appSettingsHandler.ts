/**
 * Handlers para gerenciamento de configurações da aplicação.
 * 
 * Inclui funções para obter e atualizar as configurações gerais usadas pela aplicação.
 */

import { Request, Response } from 'express';
import { storage } from '../storage';

/**
 * Obtém as configurações da aplicação.
 * 
 * @param req Requisição Express
 * @param res Resposta Express
 */
export const getAppSettings = async (req: Request, res: Response) => {
  try {
    console.log('[HANDLER] Iniciando busca de configurações da aplicação');
    const settings = await storage.getAppSettings();
    
    // Certificar que estamos enviando um objeto válido
    if (!settings) {
      console.warn('[HANDLER] Configurações não encontradas, criando padrão');
      const defaultSettings = {
        defaultProfitMargin: 4.0,
        defaultTonnage: 1000,
        notifications: true,
        darkMode: false,
        id: 'default_error'
      };
      
      res.json(defaultSettings);
      return;
    }
    
    console.log('[HANDLER] Enviando configurações:', settings);
    res.json(settings);
  } catch (error) {
    console.error('[HANDLER] Erro ao recuperar configurações da aplicação:', error);
    res.status(500).json({ 
      message: 'Falha ao recuperar configurações da aplicação', 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Atualiza as configurações da aplicação.
 * 
 * @param req Requisição Express com configurações a serem atualizadas
 * @param res Resposta Express
 */
export const updateAppSettings = async (req: Request, res: Response) => {
  try {
    console.log('[HANDLER] Iniciando atualização de configurações:', req.body);
    const settings = await storage.updateAppSettings(req.body);
    
    if (!settings) {
      console.error('[HANDLER] Retorno nulo da atualização de configurações');
      res.status(500).json({ 
        message: 'Falha ao atualizar configurações - retorno nulo',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    console.log('[HANDLER] Configurações atualizadas com sucesso');
    res.json(settings);
  } catch (error) {
    console.error('[HANDLER] Erro ao atualizar configurações da aplicação:', error);
    res.status(500).json({ 
      message: 'Falha ao atualizar configurações da aplicação', 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
};