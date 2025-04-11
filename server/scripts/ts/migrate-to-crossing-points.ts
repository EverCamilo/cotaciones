/**
 * Script para migrar os dados das antigas aduanas (separadas por país) 
 * para o novo modelo unificado de Pontos de Travessia.
 * 
 * Este script:
 * 1. Busca todas as aduanas brasileiras e paraguaias
 * 2. Agrupa aduanas brasileiras com seus pares paraguaios
 * 3. Cria novos registros de Ponto de Travessia unificados
 */

import { storage } from "../../storage";
import { 
  AduanaInfo, 
  InsertCrossingPoint,
  CrossingPoint 
} from "../../../shared/schema";

async function migrateToNewModel() {
  try {
    console.log("Iniciando migração para modelo de Pontos de Travessia...");
    
    // Passo 1: Obter todas as aduanas
    const allAduanas = await storage.getAllAduanaInfo();
    console.log(`Total de aduanas encontradas: ${allAduanas.length}`);
    
    // Passo 2: Separar aduanas por país
    const brAduanas = allAduanas.filter(aduana => aduana.country === "BR");
    const pyAduanas = allAduanas.filter(aduana => aduana.country === "PY");
    
    console.log(`Aduanas brasileiras: ${brAduanas.length}`);
    console.log(`Aduanas paraguaias: ${pyAduanas.length}`);
    
    // Passo 3: Agrupar aduanas por pares (BR-PY)
    const crossingPoints: InsertCrossingPoint[] = [];
    
    for (const brAduana of brAduanas) {
      // Buscar aduana paraguaia correspondente
      const pyAduana = pyAduanas.find(aduana => aduana.name === brAduana.partnerAduana);
      
      if (pyAduana) {
        console.log(`Criando Ponto de Travessia: ${brAduana.name} - ${pyAduana.name}`);
        
        // Criar o modelo unificado
        const crossingPoint: InsertCrossingPoint = {
          name: `${brAduana.name} - ${pyAduana.name}`,
          description: `Ponto de travessia entre ${brAduana.name} (BR) e ${pyAduana.name} (PY)`,
          active: true,
          
          // Dados das aduanas
          brazilianSide: {
            name: brAduana.name,
            coordinates: brAduana.coordinates
          },
          paraguayanSide: {
            name: pyAduana.name,
            coordinates: pyAduana.coordinates
          },
          
          // Dados de custos FAF (sempre do lado BR)
          faf: {
            perTruck: brAduana.fafPerTruck || "0",
            lot1000: brAduana.fafLot1000 || "0",
            lot1500: brAduana.fafLot1500 || "0"
          },
          
          // Dados de FULA
          fula: {
            enabled: brAduana.hasFula || false,
            costPerTon: brAduana.fulaCost || null
          },
          
          // Dados de MAPA
          mapa: {
            costPerTon: brAduana.mapaCost || null,
            acerto: brAduana.mapaAcerto || null,
            fixo: brAduana.mapaFixo || null,
            lot1000: brAduana.mapaCost1000 || null,
            lot1500: brAduana.mapaCost1500 || null
          },
          
          // Dados de balsa
          balsa: {
            enabled: brAduana.hasBalsa || false,
            defaultCost: brAduana.balsaCost && typeof brAduana.balsaCost === 'object' 
              ? (brAduana.balsaCost.default || null) 
              : null,
            puertoIndioCost: brAduana.balsaCost && typeof brAduana.balsaCost === 'object' 
              ? (brAduana.balsaCost.puerto_indio || null) 
              : null,
            sangaFundaCost: brAduana.balsaCost && typeof brAduana.balsaCost === 'object' 
              ? (brAduana.balsaCost.sanga_funda || null) 
              : null
          },
          
          // Dados de estacionamento
          estacionamento: {
            enabled: brAduana.hasEstacionamento || false,
            costPerTruck: brAduana.estacionamentoCost || null
          },
          
          // Dados de Dinatran
          dinatran: {
            enabled: brAduana.dinatranCost ? true : false,
            costPerTruck: brAduana.dinatranCost || null
          },
          
          // Dados de comissão Luiz Baciquet
          comissaoLuiz: {
            enabled: brAduana.hasComissaoLuiz || false,
            costPerTon: brAduana.comissaoLuiz || null
          },
          
          // Outras taxas
          otherFees: brAduana.otherFees || {}
        };
        
        crossingPoints.push(crossingPoint);
      } else {
        console.warn(`Aduana paraguaia correspondente não encontrada para: ${brAduana.name}`);
      }
    }
    
    // Passo 4: Salvar os novos Pontos de Travessia no banco de dados
    console.log(`\nTotal de Pontos de Travessia a serem criados: ${crossingPoints.length}`);
    
    for (const point of crossingPoints) {
      try {
        await storage.createCrossingPoint(point);
        console.log(`✓ Ponto de Travessia "${point.name}" criado com sucesso`);
      } catch (error) {
        console.error(`✗ Erro ao criar Ponto de Travessia "${point.name}":`, error);
      }
    }
    
    console.log("\nMigração para modelo de Pontos de Travessia concluída!");
  } catch (error) {
    console.error("Erro durante a migração:", error);
  }
}

// Executar a migração
migrateToNewModel()
  .then(() => {
    console.log("Script finalizado.");
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  });