/**
 * Formata um valor para exibição como moeda
 * @param value Valor a ser formatado
 * @param currency Código da moeda (USD, BRL, etc)
 * @param decimals Número de casas decimais (padrão: 2)
 * @returns String formatada
 */
export const formatCurrency = (
  value: number | string | undefined, 
  currency = 'USD', 
  decimals = 2
): string => {
  // Se o valor for undefined ou null, retorna traço
  if (value === undefined || value === null) return '—';
  
  // Converte string para número se necessário
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Se não for um número válido, retorna traço
  if (isNaN(numValue)) return '—';
  
  // Formata o valor com o símbolo da moeda adequado
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  // Formata e retorna o valor
  return formatter.format(numValue);
};

/**
 * Formata um valor para exibição como USD
 * Usando o símbolo U$ como padrão do sistema
 * @param value Valor a ser formatado
 * @param decimals Número de casas decimais (padrão: 2)
 * @returns String formatada com símbolo U$
 */
export const formatUSD = (
  value: number | string | undefined, 
  decimals = 2
): string => {
  // Se o valor for undefined ou null, retorna traço
  if (value === undefined || value === null) return '—';
  
  // Converte string para número se necessário
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Se não for um número válido, retorna traço
  if (isNaN(numValue)) return '—';
  
  // Formata o número com a precisão correta
  const formattedNumber = numValue.toFixed(decimals);
  
  // Adiciona separador de milhares
  const parts = formattedNumber.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retorna com o símbolo U$ no início
  return `U$ ${parts.join(',')}`;
};

/**
 * Formata uma data para o formato brasileiro (dd/mm/yyyy)
 * @param date Data a ser formatada (string ISO ou objeto Date)
 * @returns String formatada
 */
export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return '—';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR');
  } catch (e) {
    return '—';
  }
};

/**
 * Formata uma localização, extraindo apenas a cidade principal
 * @param location String de localização completa (ex: "Cidade, Estado, País")
 * @returns Nome da cidade principal
 */
export const formatLocation = (location: string | undefined): string => {
  if (!location) return 'N/A';
  
  // Extrai apenas o primeiro componente (geralmente a cidade)
  return location.split(',')[0].trim();
};

export default {
  formatCurrency,
  formatUSD,
  formatDate,
  formatLocation
};