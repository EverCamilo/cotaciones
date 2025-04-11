/**
 * Utilitários de formatação para uso em todo o aplicativo
 */

/**
 * Formata valores monetários
 * @param value - Valor a ser formatado
 * @param currency - Moeda (padrão: USD)
 * @returns String formatada com símbolo de moeda
 */
export const formatCurrency = (value: number | string | undefined, currency = 'USD'): string => {
  if (value === undefined || value === null) return '—';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '—';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(numValue);
};

/**
 * Formata datas para o formato brasileiro
 * @param dateString - String de data ou objeto Date
 * @returns Data formatada (DD/MM/AAAA)
 */
export const formatDate = (dateString?: string | Date): string => {
  try {
    if (!dateString) return new Date().toLocaleDateString('pt-BR');
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-BR');
  } catch (e) {
    return new Date().toLocaleDateString('pt-BR');
  }
};

/**
 * Remove aspas e formatação indesejada de strings de localização
 * @param location - String de localização que pode conter aspas
 * @returns String limpa sem aspas
 */
export const formatLocationString = (location: string | undefined): string => {
  if (!location) return '';
  
  // Remove aspas do início e do fim da string, se houver
  return location.replace(/^["']|["']$/g, '');
};

/**
 * Formata número com separadores de milhares
 * @param value - Número a ser formatado
 * @param decimalPlaces - Casas decimais (padrão: 2)
 * @returns String formatada com separadores de milhares
 */
export const formatNumber = (value: number | undefined, decimalPlaces = 2): string => {
  if (value === undefined || value === null) return '—';
  
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
};

/**
 * Formata um valor em toneladas
 * @param tonnage - Valor em toneladas
 * @returns String formatada com unidade
 */
export const formatTonnage = (tonnage: number | undefined): string => {
  if (tonnage === undefined || tonnage === null) return '—';
  
  return `${tonnage.toLocaleString('pt-BR')} ton`;
};