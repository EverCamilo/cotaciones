/**
 * Script para limpar aduanas duplicadas no banco de dados.
 * Mantém apenas o registro mais recente de cada aduana (baseado no ID).
 */

import { storage } from "../../storage";

async function cleanupDuplicateAduanas() {
  try {
    console.log("Iniciando limpeza de aduanas duplicadas...");
    
    // Passo 1: Obter todas as aduanas
    const allAduanas = await storage.getAllAduanaInfo();
    console.log(`Total de aduanas encontradas: ${allAduanas.length}`);
    
    // Passo 2: Agrupar aduanas por nome
    const aduanasByName: Record<string, any[]> = {};
    
    allAduanas.forEach(aduana => {
      if (!aduanasByName[aduana.name]) {
        aduanasByName[aduana.name] = [];
      }
      aduanasByName[aduana.name].push(aduana);
    });
    
    // Passo 3: Identificar duplicatas
    const duplicates: string[] = [];
    const toKeep: string[] = [];
    
    for (const [name, aduanas] of Object.entries(aduanasByName)) {
      if (aduanas.length > 1) {
        console.log(`Aduana "${name}" tem ${aduanas.length} registros duplicados`);
        
        // Ordenar por ID (assumindo que IDs mais recentes são lexicograficamente maiores)
        // Em uma base de dados real, usaríamos um campo de timestamp para ordenação
        aduanas.sort((a, b) => {
          // Se não tivermos ID, isso é estranho, mas mantém o comportamento
          if (!a.id || !b.id) return 0;
          // Comparação lexicográfica inversa (do mais recente para o mais antigo)
          return b.id.localeCompare(a.id);
        });
        
        // Manter o primeiro (mais recente) e marcar os outros para exclusão
        toKeep.push(aduanas[0].id);
        console.log(`  - Mantendo: ${aduanas[0].id}`);
        
        for (let i = 1; i < aduanas.length; i++) {
          duplicates.push(aduanas[i].id);
          console.log(`  - Excluindo: ${aduanas[i].id}`);
        }
      } else {
        // Não há duplicata para esta aduana
        toKeep.push(aduanas[0].id);
      }
    }
    
    // Passo 4: Excluir as duplicatas
    console.log(`\nTotal de duplicatas a serem excluídas: ${duplicates.length}`);
    console.log(`Total de aduanas a serem mantidas: ${toKeep.length}`);
    
    if (duplicates.length > 0) {
      for (const id of duplicates) {
        try {
          await storage.deleteAduanaInfo(id);
          console.log(`Excluída aduana com ID: ${id}`);
        } catch (error) {
          console.error(`Erro ao excluir aduana ${id}:`, error);
        }
      }
    }
    
    console.log("\nLimpeza de aduanas duplicadas concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a limpeza de aduanas:", error);
  }
}

// Executar a limpeza ao iniciar
cleanupDuplicateAduanas()
  .then(() => {
    console.log("Script finalizado.");
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  });