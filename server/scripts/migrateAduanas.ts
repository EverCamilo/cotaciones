/**
 * Script para migrar os dados das aduanas do formato hardcoded para o banco de dados.
 * Este script lê os dados existentes no arquivo aduanaHelper.ts e cria registros
 * correspondentes no banco de dados Firebase.
 */

import { ADUANA_INFO, getParaguayanAduana } from "../../client/src/utils/aduanaHelper";
import { storage } from "../storage";
import { type InsertAduanaInfo } from "@shared/schema";

// Coordenadas das aduanas
const ADUANA_COORDINATES = {
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

/**
 * Converte uma aduana do formato antigo para o formato do banco de dados
 */
function convertAduana(name: string, data: any): InsertAduanaInfo {
  // Obter a aduana parceira
  const partnerAduana = getParaguayanAduana(name);
  
  // Converter para o novo formato
  const newAduana: InsertAduanaInfo = {
    name,
    country: "BR",
    coordinates: ADUANA_COORDINATES[name] || { lat: 0, lng: 0 },
    partnerAduana,
    
    // Campos de custos FAF
    fafPerTruck: data.faf_per_truck.toString(),
    fafLot1000: data.faf_lot_1000.toString(),
    fafLot1500: data.faf_lot_1500.toString(),
    
    // Campos relacionados a FULA
    hasFula: data.has_fula,
    fulaCost: data.fula_cost ? data.fula_cost.toString() : null,
    
    // Campos relacionados a MAPA
    mapaCost: data.mapa_cost ? data.mapa_cost.toString() : null,
    mapaAcerto: data.mapa_acerto ? data.mapa_acerto.toString() : null,
    mapaFixo: data.mapa_fixo ? data.mapa_fixo.toString() : null,
    mapaCost1000: data.mapa_cost_1000 ? data.mapa_cost_1000.toString() : null,
    mapaCost1500: data.mapa_cost_1500 ? data.mapa_cost_1500.toString() : null,
    
    // Campos relacionados a balsa
    hasBalsa: data.has_balsa,
    balsaCost: data.balsa_cost ? { 
      default: data.balsa_cost,
      puerto_indio: data.balsa_puerto_indio || null
    } : null,
    
    // Campo relacionado a estacionamento
    hasEstacionamento: data.has_estacionamento,
    estacionamentoCost: data.estacionamento_cost ? data.estacionamento_cost.toString() : null,
    
    // Campos relacionados a Dinatran
    dinatranCost: data.dinatran_cost ? data.dinatran_cost.toString() : null,
    
    // Campos relacionados a comissão
    hasComissaoLuiz: data.has_comissao_luiz,
    comissaoLuiz: data.comissao_luiz ? data.comissao_luiz.toString() : null,
    
    // Outros custos
    otherFees: {}
  };
  
  return newAduana;
}

/**
 * Cria as aduanas paraguaias correspondentes
 */
function createParaguayanAduana(name: string): InsertAduanaInfo {
  const coordinates = ADUANA_COORDINATES[name] || { lat: 0, lng: 0 };
  
  // Determinar aduana parceira no Brasil
  let partnerAduana: string | null = null;
  if (name === "Salto del Guaíra") {
    partnerAduana = "Guaíra"; // ou "Mundo Novo", mas usamos Guaíra como principal
  } else if (name === "Ciudad del Este") {
    partnerAduana = "Foz do Iguaçu";
  } else if (name === "Puerto Indio") {
    partnerAduana = "Santa Helena";
  }
  
  return {
    name,
    country: "PY",
    coordinates,
    partnerAduana,
    
    // Definir valores padrão para aduanas paraguaias
    fafPerTruck: "0",
    fafLot1000: "0",
    fafLot1500: "0",
    hasFula: false,
    hasBalsa: false,
    hasEstacionamento: false,
    hasComissaoLuiz: false,
    otherFees: {}
  };
}

/**
 * Função principal para migrar os dados das aduanas
 */
async function migrateAduanas() {
  try {
    console.log("Iniciando migração de aduanas para o banco de dados...");
    
    // Passo 1: Verificar se já existem aduanas no banco de dados
    const existingAduanas = await storage.getAllAduanaInfo();
    if (existingAduanas.length > 0) {
      console.log(`Encontradas ${existingAduanas.length} aduanas no banco. Excluindo...`);
      
      // Em um ambiente real, você pode querer confirmar antes de excluir
      // Por enquanto, simulamos a exclusão exibindo as que seriam excluídas
      for (const aduana of existingAduanas) {
        console.log(`- Seria excluída: ${aduana.name} (${aduana.country}), ID: ${aduana.id}`);
      }
      
      // Na prática, você teria que implementar uma função para excluir aduanas
      // que não está disponível no momento
      console.log("Aduanas existentes seriam excluídas aqui (não implementado).");
    }
    
    // Passo 2: Criar as aduanas brasileiras
    console.log("\nCriando aduanas brasileiras...");
    for (const [name, data] of Object.entries(ADUANA_INFO)) {
      const aduanaData = convertAduana(name, data);
      try {
        const createdAduana = await storage.createAduanaInfo(aduanaData);
        console.log(`- Criada aduana brasileira: ${name}, ID: ${createdAduana.id}`);
      } catch (error) {
        console.error(`Erro ao criar aduana brasileira ${name}:`, error);
      }
    }
    
    // Passo 3: Criar as aduanas paraguaias
    console.log("\nCriando aduanas paraguaias...");
    const paraguayanAduanas = ["Salto del Guaíra", "Ciudad del Este", "Puerto Indio"];
    for (const name of paraguayanAduanas) {
      const aduanaData = createParaguayanAduana(name);
      try {
        const createdAduana = await storage.createAduanaInfo(aduanaData);
        console.log(`- Criada aduana paraguaia: ${name}, ID: ${createdAduana.id}`);
      } catch (error) {
        console.error(`Erro ao criar aduana paraguaia ${name}:`, error);
      }
    }
    
    console.log("\nMigração de aduanas concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a migração de aduanas:", error);
  }
}

// Exportar a função para permitir execução de outros scripts
export { migrateAduanas };