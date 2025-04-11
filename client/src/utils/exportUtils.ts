import * as XLSX from 'xlsx';
import { FreightQuote } from '@/contexts/FreightContext';

// Formatador de localização para remover caracteres especiais
export const formatLocationString = (location: string | undefined): string => {
  if (!location) return '';
  
  // Remove aspas do início e do fim da string, se houver
  return location.replace(/^["']|["']$/g, '');
};

/**
 * Formata os dados de cotações para exportação em Excel
 * @param quotes Lista de cotações para exportar
 * @param fileName Nome do arquivo Excel a ser gerado (opcional)
 */
export const exportQuotesToExcel = (quotes: FreightQuote[], fileName?: string) => {
  if (!quotes || quotes.length === 0) return;
  
  // Criar um novo workbook
  const workbook = XLSX.utils.book_new();
  
  // Criar worksheet com dados formatados
  const worksheet = XLSX.utils.aoa_to_sheet([]);
  
  // Adicionar título e data do relatório
  XLSX.utils.sheet_add_aoa(worksheet, [
    [`RELATÓRIO DE COTAÇÕES - TRANS FENIX`],
    [`Data de geração: ${new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    })}`],
    [`Total de cotações: ${quotes.length}`],
    [''] // Linha em branco
  ], { origin: 'A1' });
  
  // Adicionar cabeçalhos com formatação
  XLSX.utils.sheet_add_aoa(worksheet, [
    [
      'ID', 'Data', 'Cliente', 'Origem', 'País Origem', 'Destino', 'País Destino', 'Produto', 
      'Toneladas', 'Aduana', 'USD/Ton', 'Custo Base/Ton', 'Margem/Ton',
      'Distância (km)', 'Câmbio USD/BRL', 'Total USD', 'Caminhões'
    ]
  ], { origin: 'A5' });
  
  // Formatar dados para cada linha e adicionar ao worksheet
  const formattedData = quotes.map((q) => [
    q.id ? q.id.slice(0, 8) : 'N/A',
    q.createdAt ? new Date(q.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
    q.clientName || 'N/A',
    formatLocationString(q.customsDetails?.originLocation || q.originCity || q.origin),
    q.origin?.includes('Brasil') || q.origin?.includes('BR') ? 'Brasil' : 'Paraguai',
    formatLocationString(q.customsDetails?.destinationLocation || q.destinationCity || q.destination),
    q.destination?.includes('Brasil') || q.destination?.includes('BR') ? 'Brasil' : 'Paraguai',
    q.productType + (q.specificProduct ? ` - ${q.specificProduct}` : ''),
    Number(q.tonnage),
    q.aduanaBr || q.recommendedAduana || 'N/A',
    Number(q.costPerTon || 0),
    // Usar a margem real da cotação
    // O custo base é o USD/Ton menos a margem real
    (Number(q.costPerTon || 0) - Number(q.marginPerTon || q.profitMargin || 0)),
    // Utilizar a margem por tonelada real da cotação
    Number(q.marginPerTon || q.profitMargin || 0),
    q.totalDistance ? Math.round(Number(q.totalDistance)) : 'N/A',
    q.exchangeRate ? Number(q.exchangeRate).toFixed(2) : 'N/A',
    Number(q.totalCost || 0).toFixed(2),
    Number(q.requiredTrucks || 0)
  ]);
  
  XLSX.utils.sheet_add_aoa(worksheet, formattedData, { origin: 'A6' });
  
  // Definir larguras das colunas
  worksheet['!cols'] = [
    { wch: 10 }, // ID
    { wch: 12 }, // Data
    { wch: 25 }, // Cliente
    { wch: 30 }, // Origem
    { wch: 12 }, // País Origem
    { wch: 30 }, // Destino
    { wch: 12 }, // País Destino
    { wch: 20 }, // Produto
    { wch: 10 }, // Toneladas
    { wch: 20 }, // Aduana
    { wch: 10 }, // USD/Ton
    { wch: 14 }, // Custo Base/Ton
    { wch: 12 }, // Margem/Ton
    { wch: 15 }, // Distância
    { wch: 15 }, // Câmbio
    { wch: 12 }, // Total USD
    { wch: 10 }  // Caminhões
  ];
  
  // Mesclar células dos títulos
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } }, // Mesclar título
    { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } }, // Mesclar data
    { s: { r: 2, c: 0 }, e: { r: 2, c: 16 } }  // Mesclar total de cotações
  ];
  
  // Adicionar a planilha ao workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotações');
  
  // Adicionar resumo em uma segunda aba
  const summaryWorksheet = XLSX.utils.aoa_to_sheet([
    ['RESUMO DE COTAÇÕES'],
    [''],
    ['Total de cotações:', quotes.length],
    ['Tonelagem total:', quotes.reduce((acc, q) => acc + Number(q.tonnage || 0), 0).toFixed(2)],
    ['Valor total (USD):', quotes.reduce((acc, q) => acc + Number(q.totalCost || 0), 0).toFixed(2)],
    ['Média USD/Ton:', (quotes.reduce((acc, q) => acc + Number(q.costPerTon || 0), 0) / quotes.length).toFixed(2)],
    ['Margem média (USD/Ton):', (quotes.reduce((acc, q) => {
      // Usar a margem real da cotação
      return acc + Number(q.marginPerTon || q.profitMargin || 0);
    }, 0) / quotes.length).toFixed(2)],
    ['Distância média (km):', Math.round(quotes.reduce((acc, q) => acc + Number(q.totalDistance || 0), 0) / quotes.length)],
  ]);
  
  // Configurar larguras para a aba de resumo
  summaryWorksheet['!cols'] = [
    { wch: 25 },
    { wch: 20 }
  ];
  
  // Adicionar a planilha de resumo ao workbook
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumo');
  
  // Definir nome do arquivo
  const actualFileName = fileName || `cotacoes_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
  
  // Exportar o arquivo
  XLSX.writeFile(workbook, actualFileName);
};

/**
 * Exporta uma única cotação para Excel
 * @param quote Cotação a ser exportada
 * @param fileName Nome do arquivo Excel a ser gerado (opcional)
 */
export const exportQuoteToExcel = (quote: FreightQuote, fileName?: string) => {
  if (!quote) return;
  
  exportQuotesToExcel([quote], fileName || `cotacao_${quote.id?.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export default {
  exportQuotesToExcel,
  exportQuoteToExcel
};