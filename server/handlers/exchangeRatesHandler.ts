import { Request, Response } from 'express';
import { storage } from '../storage';
import fetch from 'node-fetch';
import { InsertExchangeRate } from '@shared/schema';

const DEFAULT_RATES = {
  usdToBrl: "5.40",  // 1 USD = 5.40 BRL
  usdToGs: "7500.0"  // 1 USD = 7500 Guarani
};

export async function getExchangeRates(req: Request, res: Response) {
  try {
    // First check if we have recent rates in storage (less than 6 hours old)
    const storedRates = await storage.getLatestExchangeRate();
    
    if (storedRates) {
      const storedRatesTimestamp = storedRates.updatedAt ? new Date(storedRates.updatedAt).getTime() : 0;
      const currentTime = new Date().getTime();
      const sixHoursInMs = 6 * 60 * 60 * 1000;
      
      // If rates are less than 6 hours old, use them
      if (currentTime - storedRatesTimestamp < sixHoursInMs) {
        return res.json({
          usdToBrl: Number(storedRates.usdToBrl),
          usdToGs: Number(storedRates.usdToGs),
          updatedAt: storedRates.updatedAt,
          id: storedRates.id
        });
      }
    }
    
    // Try to fetch fresh rates from API
    const freshRates = await fetchFreshRates();
    
    if (freshRates) {
      // Save the fresh rates
      const savedRates = await storage.createExchangeRate(freshRates);
      
      return res.json({
        usdToBrl: Number(savedRates.usdToBrl),
        usdToGs: Number(savedRates.usdToGs),
        updatedAt: savedRates.updatedAt,
        id: savedRates.id
      });
    }
    
    // If we couldn't get fresh rates, use the stored ones even if they're old
    if (storedRates) {
      return res.json({
        usdToBrl: Number(storedRates.usdToBrl),
        usdToGs: Number(storedRates.usdToGs),
        updatedAt: storedRates.updatedAt,
        id: storedRates.id
      });
    }
    
    // If all else fails, use default rates
    const defaultRates = await storage.createExchangeRate(DEFAULT_RATES);
    return res.json({
      usdToBrl: Number(defaultRates.usdToBrl),
      usdToGs: Number(defaultRates.usdToGs),
      updatedAt: defaultRates.updatedAt,
      id: defaultRates.id
    });
    
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // In case of any error, return default rates
    res.json({
      ...DEFAULT_RATES,
      updatedAt: new Date(),
      note: 'Using default rates due to an error'
    });
  }
}

async function fetchFreshRates(): Promise<InsertExchangeRate | null> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (response.ok) {
      const data = await response.json() as any;
      const rates = data.rates || {};
      
      return {
        usdToBrl: String(rates.BRL || DEFAULT_RATES.usdToBrl),
        usdToGs: String(rates.PYG || DEFAULT_RATES.usdToGs), // Guarani (GS) is represented as PYG in the API
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching exchange rates from API:', error);
    return null;
  }
}
