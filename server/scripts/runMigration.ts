/**
 * Ponto de entrada para executar o script de migração de aduanas
 */

import { migrateAduanas } from "./migrateAduanas";

// Executar a migração
migrateAduanas().then(() => {
  console.log("Script de migração finalizado.");
  process.exit(0);
}).catch((error) => {
  console.error("Erro fatal durante a execução do script:", error);
  process.exit(1);
});