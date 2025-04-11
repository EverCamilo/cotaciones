/**
 * Script para atualizar os dados das aduanas no banco de dados
 * para corresponder aos valores originais do arquivo aduana_info.py
 */

import { storage } from "../../storage";
import { AduanaInfo } from "../../../shared/schema";

// Valores originais do arquivo aduana_info.py
const ORIGINAL_ADUANA_DATA = {
  "Guaíra": {
    "name": "Guaíra",
    "country": "BR",
    "coordinates": {"lat": -24.0860, "lng": -54.2567},
    "partnerAduana": "Salto del Guaíra",
    "fafPerTruck": "220000",  
    "fafLot1000": "400000",   
    "fafLot1500": "600000",   
    "hasFula": true,
    "fulaCost": "0.50",        
    "mapaCost": "0.23",        
    "hasBalsa": true,
    "balsaCost": {
      "default": 269
    },       
    "hasEstacionamento": true,
    "estacionamentoCost": "73", 
    "hasComissaoLuiz": false,
    "comissaoLuiz": null,
    "mapaAcerto": null,
    "mapaFixo": null,
    "mapaCost1000": null,
    "mapaCost1500": null,
    "dinatranCost": null,
    "otherFees": {}
  },
  "Mundo Novo": {
    "name": "Mundo Novo",
    "country": "BR",
    "coordinates": {"lat": -23.9421, "lng": -54.2805},
    "partnerAduana": "Salto del Guaíra",
    "fafPerTruck": "220000",  
    "fafLot1000": "400000",   
    "fafLot1500": "600000",   
    "hasFula": true,
    "fulaCost": "0.50",        
    "mapaCost": "0.23",        
    "hasBalsa": false,
    "balsaCost": null,       
    "hasEstacionamento": false,
    "estacionamentoCost": null, 
    "hasComissaoLuiz": false,
    "comissaoLuiz": null,
    "mapaAcerto": null,
    "mapaFixo": null,
    "mapaCost1000": null,
    "mapaCost1500": null,
    "dinatranCost": null,
    "otherFees": {}
  },
  "Foz do Iguaçu": {
    "name": "Foz do Iguaçu",
    "country": "BR",
    "coordinates": {"lat": -25.5094, "lng": -54.5967},
    "partnerAduana": "Ciudad del Este",
    "fafPerTruck": "200000",  
    "fafLot1000": "400000",   
    "fafLot1500": "600000",   
    "hasFula": false,
    "fulaCost": null,
    "mapaCost": null,
    "mapaAcerto": "1.00",
    "mapaFixo": "0.62",
    "hasBalsa": false,
    "balsaCost": null,       
    "hasEstacionamento": true,
    "estacionamentoCost": "80", 
    "hasComissaoLuiz": false,
    "comissaoLuiz": null,
    "mapaCost1000": null,
    "mapaCost1500": null,
    "dinatranCost": null,
    "otherFees": {}
  },
  "Santa Helena": {
    "name": "Santa Helena",
    "country": "BR",
    "coordinates": {"lat": -24.9264, "lng": -54.3811},
    "partnerAduana": "Puerto Indio",
    "fafPerTruck": "200000",  
    "fafLot1000": "400000",   
    "fafLot1500": "600000",   
    "hasFula": false,
    "fulaCost": null,
    "mapaCost": null,
    "mapaAcerto": null,
    "mapaFixo": null,
    "mapaCost1000": "350",
    "mapaCost1500": "500",
    "hasBalsa": true,
    "balsaCost": {
      "puerto_indio": 410,
      "sanga_funda": 445
    },
    "hasEstacionamento": true,
    "estacionamentoCost": "39.12", 
    "dinatranCost": "11",
    "hasComissaoLuiz": true,
    "comissaoLuiz": "1.70",
    "otherFees": {}
  },
  "Salto del Guaíra": {
    "name": "Salto del Guaíra",
    "country": "PY",
    "coordinates": {"lat": -24.0886, "lng": -54.3368},
    "partnerAduana": "Guaíra",
    "fafPerTruck": "0",
    "fafLot1000": "0",
    "fafLot1500": "0",
    "hasFula": false,
    "fulaCost": null,
    "hasBalsa": false,
    "balsaCost": null,
    "hasEstacionamento": false,
    "estacionamentoCost": null,
    "hasComissaoLuiz": false,
    "comissaoLuiz": null,
    "mapaAcerto": null,
    "mapaFixo": null,
    "mapaCost": null,
    "mapaCost1000": null,
    "mapaCost1500": null,
    "dinatranCost": null,
    "otherFees": {}
  },
  "Ciudad del Este": {
    "name": "Ciudad del Este",
    "country": "PY",
    "coordinates": {"lat": -25.5096, "lng": -54.6038},
    "partnerAduana": "Foz do Iguaçu",
    "fafPerTruck": "0",
    "fafLot1000": "0",
    "fafLot1500": "0",
    "hasFula": false,
    "fulaCost": null,
    "hasBalsa": false,
    "balsaCost": null,
    "hasEstacionamento": false,
    "estacionamentoCost": null,
    "hasComissaoLuiz": false,
    "comissaoLuiz": null,
    "mapaAcerto": null,
    "mapaFixo": null,
    "mapaCost": null,
    "mapaCost1000": null,
    "mapaCost1500": null,
    "dinatranCost": null,
    "otherFees": {}
  },
  "Puerto Indio": {
    "name": "Puerto Indio",
    "country": "PY",
    "coordinates": {"lat": -24.9164, "lng": -54.4609},
    "partnerAduana": "Santa Helena",
    "fafPerTruck": "0",
    "fafLot1000": "0",
    "fafLot1500": "0",
    "hasFula": false,
    "fulaCost": null,
    "hasBalsa": false,
    "balsaCost": null,
    "hasEstacionamento": false,
    "estacionamentoCost": null,
    "hasComissaoLuiz": false,
    "comissaoLuiz": null,
    "mapaAcerto": null,
    "mapaFixo": null,
    "mapaCost": null,
    "mapaCost1000": null,
    "mapaCost1500": null,
    "dinatranCost": null,
    "otherFees": {}
  }
};

async function updateAduanasToOriginal() {
  try {
    console.log("Iniciando atualização de aduanas para valores originais...");
    
    // Obter todas as aduanas do banco de dados
    const allAduanas = await storage.getAllAduanaInfo();
    console.log(`Total de aduanas encontradas: ${allAduanas.length}`);
    
    // Mapear aduanas por nome para facilitar atualização
    const aduanasByName: Record<string, AduanaInfo> = {};
    
    allAduanas.forEach(aduana => {
      aduanasByName[aduana.name] = aduana;
    });
    
    // Atualizar cada aduana com os valores originais
    for (const [name, originalData] of Object.entries(ORIGINAL_ADUANA_DATA)) {
      const existingAduana = aduanasByName[name];
      
      if (existingAduana) {
        console.log(`Atualizando aduana "${name}" (ID: ${existingAduana.id})`);
        
        try {
          await storage.updateAduanaInfo(existingAduana.id, originalData);
          console.log(`  ✓ Aduana "${name}" atualizada com sucesso`);
        } catch (error) {
          console.error(`  ✗ Erro ao atualizar aduana "${name}":`, error);
        }
      } else {
        console.log(`Aduana "${name}" não encontrada no banco de dados. Criando...`);
        
        try {
          const newAduana = await storage.createAduanaInfo(originalData as any);
          console.log(`  ✓ Aduana "${name}" criada com sucesso (ID: ${newAduana.id})`);
        } catch (error) {
          console.error(`  ✗ Erro ao criar aduana "${name}":`, error);
        }
      }
    }
    
    console.log("\nAtualização de aduanas concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a atualização de aduanas:", error);
  }
}

// Executar a atualização
updateAduanasToOriginal()
  .then(() => {
    console.log("Script finalizado.");
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  });