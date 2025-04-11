interface ExchangeRates {
  USD_BRL: number;
  USD_GS: number;
}

const DEFAULT_RATES: ExchangeRates = {
  USD_BRL: 5.40,  // 1 USD = 5.40 BRL
  USD_GS: 7500.0  // 1 USD = 7500 Guarani
};

export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    // First try to get rates from our own API
    const response = await fetch('/api/exchange-rates');
    
    if (response.ok) {
      const data = await response.json();
      return {
        USD_BRL: data.usdToBrl,
        USD_GS: data.usdToGs
      };
    }
    
    // If that fails, try a free API
    const freeApiUrl = "https://api.exchangerate-api.com/v4/latest/USD";
    const freeResponse = await fetch(freeApiUrl, { timeout: 5000 } as RequestInit);
    
    if (freeResponse.ok) {
      const data = await freeResponse.json();
      const rates = data.rates || {};
      
      return {
        USD_BRL: rates.BRL || DEFAULT_RATES.USD_BRL,
        USD_GS: rates.PYG || DEFAULT_RATES.USD_GS, // Guarani (GS) is represented as PYG in the API
      };
    }
    
    // If API requests fail, use default rates
    console.warn("Exchange rate API request failed. Using default rates.");
    return DEFAULT_RATES;
  } catch (error) {
    console.error("Error getting exchange rates:", error);
    return DEFAULT_RATES;
  }
}

export function convertCurrency(
  amount: number,
  fromCurrency: 'USD' | 'BRL' | 'GS',
  toCurrency: 'USD' | 'BRL' | 'GS',
  exchangeRates: ExchangeRates
): number | null {
  try {
    // Validate inputs
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error(`Amount must be a valid number, got ${typeof amount}`);
    }
    
    if (amount < 0) {
      throw new Error("Amount cannot be negative");
    }
    
    const validCurrencies = ["USD", "BRL", "GS"];
    if (!validCurrencies.includes(fromCurrency)) {
      throw new Error(`Invalid source currency: ${fromCurrency}`);
    }
    if (!validCurrencies.includes(toCurrency)) {
      throw new Error(`Invalid target currency: ${toCurrency}`);
    }
    
    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // Convert to USD first (as base currency)
    let amountUsd = amount;
    if (fromCurrency === "BRL") {
      amountUsd = amount / exchangeRates.USD_BRL;
    } else if (fromCurrency === "GS") {
      amountUsd = amount / exchangeRates.USD_GS;
    }
    
    // Convert from USD to target currency
    if (toCurrency === "BRL") {
      return amountUsd * exchangeRates.USD_BRL;
    } else if (toCurrency === "GS") {
      return amountUsd * exchangeRates.USD_GS;
    }
    
    // If toCurrency is USD, amountUsd is already in USD
    return amountUsd;
    
  } catch (error) {
    console.error("Currency conversion error:", error);
    return null;
  }
}

// Format currency based on the currency type
export function formatCurrency(
  amount: number,
  currency: 'USD' | 'BRL' | 'GS'
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Invalid amount';
  }
  
  switch (currency) {
    case 'USD':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD'
      }).format(amount);
      
    case 'BRL':
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL'
      }).format(amount);
      
    case 'GS':
      // Guarani typically doesn't use decimals
      return new Intl.NumberFormat('es-PY', { 
        style: 'currency', 
        currency: 'PYG',
        maximumFractionDigits: 0
      }).format(amount);
      
    default:
      return amount.toFixed(2);
  }
}
