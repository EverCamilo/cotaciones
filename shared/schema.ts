import { z } from "zod";

// Definindo os schemas Zod diretamente para o Firebase
// OBS: Removidas todas as referências ao Drizzle ORM conforme solicitado

// Coordinate Schema para uso em vários contextos
export const coordinateSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

export type Coordinate = z.infer<typeof coordinateSchema>;

// System Configuration Schema
export const systemConfigSchema = z.object({
  id: z.string().optional(),
  aduanaCoordinates: z.record(z.string(), coordinateSchema).optional(),
  locationCoordinates: z.record(z.string(), coordinateSchema).optional(),
  defaultCrossingDistance: z.number().default(5), // Distância padrão entre aduanas em km
  updatedAt: z.date().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

export const insertSystemConfigSchema = systemConfigSchema.omit({ 
  id: true, 
  updatedAt: true,
  updatedBy: true 
});

export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = z.infer<typeof systemConfigSchema>;

// App Settings Schema
export const appSettingsSchema = z.object({
  id: z.string().optional(),
  defaultProfitMargin: z.number().default(4.0),
  defaultTonnage: z.number().default(1000),
  notifications: z.boolean().default(true),
  darkMode: z.boolean().default(false),
  updatedAt: z.date().nullable().optional(),
});

export const insertAppSettingsSchema = appSettingsSchema.omit({ 
  id: true, 
  updatedAt: true
});

export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;

// User Schema
export const userSchema = z.object({
  id: z.string().optional(),
  username: z.string(),
  password: z.string(),
  createdAt: z.date().optional().nullable(),
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof userSchema>;

// Freight Quote Schema
export const freightQuoteSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(), // Armazenar o nome do cliente diretamente para facilitar exibição
  origin: z.string(),
  originCity: z.string().optional(), // Cidade de origem (simplificada do nome completo do local)
  originPlaceId: z.string().optional(), // ID do Google Places para a origem
  destination: z.string(),
  destinationCity: z.string().optional(), // Cidade de destino (simplificada do nome completo do local)
  destinationPlaceId: z.string().optional(), // ID do Google Places para o destino
  productType: z.string(),
  specificProduct: z.string().optional(), // Produto específico quando o tipo for 'grains'
  productPrice: z.number().optional(), // Preço do produto
  tonnage: z.string().or(z.number()).transform(val => String(val)),
  driverPayment: z.string().or(z.number()).transform(val => String(val)),
  profitMargin: z.string().or(z.number()).transform(val => String(val)),
  merchandiseValue: z.string().or(z.number()).transform(val => String(val)),
  aduanaBr: z.string().optional(), // Aduana brasileira escolhida para a cotação
  recommendedAduana: z.string().nullable().optional(),
  totalCost: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  costPerTon: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  baseCostPerTon: z.string().or(z.number()).transform(val => String(val)).nullable().optional(), // Custo base por tonelada sem a margem
  marginPerTon: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  totalDistance: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  requiredTrucks: z.number().nullable().optional(),
  customsDetails: z.any().nullable().optional(),
  routeSegments: z.any().nullable().optional(), // Detalhes dos segmentos da rota
  costBreakdown: z.any().nullable().optional(),
  exchangeRate: z.number().nullable().optional(),
  estimatedProfit: z.number().nullable().optional(), // Lucro estimado total
  createdAt: z.date().nullable().optional(),
});

export const insertFreightQuoteSchema = freightQuoteSchema.omit({ id: true, createdAt: true });
export type InsertFreightQuote = z.infer<typeof insertFreightQuoteSchema>;
export type FreightQuote = z.infer<typeof freightQuoteSchema>;

// Antigo Aduana Information Schema (mantido para compatibilidade)
export const legacyAduanaInfoSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  country: z.string(), // 'BR' or 'PY'
  coordinates: z.any(), // Estrutura de coordenadas {lat: number, lng: number}
  partnerAduana: z.string().nullable().optional(),
  fafPerTruck: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  fafLot1000: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  fafLot1500: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  hasFula: z.boolean().nullable().optional(),
  fulaCost: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  hasBalsa: z.boolean().nullable().optional(),
  balsaCost: z.any().nullable().optional(),
  hasEstacionamento: z.boolean().nullable().optional(),
  estacionamentoCost: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  mapaCost: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  mapaAcerto: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  mapaFixo: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  mapaCost1000: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  mapaCost1500: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  dinatranCost: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  hasComissaoLuiz: z.boolean().nullable().optional(),
  comissaoLuiz: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  otherFees: z.any().nullable().optional(),
});

// Novo schema para Crossing Point (Ponto de Travessia)
export const crossingPointSchema = z.object({
  id: z.string().optional(),
  name: z.string(), // Nome do ponto de travessia (ex: "Mundo Novo - Salto del Guaíra")
  description: z.string().optional(),
  active: z.boolean().default(true),
  // Aduanas em cada lado da fronteira
  brazilianSide: z.object({
    name: z.string(), // Nome da aduana brasileira
    coordinates: coordinateSchema, // Coordenadas da aduana brasileira
  }),
  paraguayanSide: z.object({
    name: z.string(), // Nome da aduana paraguaia
    coordinates: coordinateSchema, // Coordenadas da aduana paraguaia
  }),
  // Custos FAF (Federação Agentes Despachantes)
  faf: z.object({
    perTruck: z.string().or(z.number()).transform(val => String(val)), // Guaranis por caminhão
    lot1000: z.string().or(z.number()).transform(val => String(val)),  // Guaranis para lotes até 1000 ton
    lot1500: z.string().or(z.number()).transform(val => String(val)),  // Guaranis para lotes acima de 1000 ton
  }),
  // Custos FULA (Fundo Unidade de Laboratório)
  fula: z.object({
    enabled: z.boolean().default(false),
    costPerTon: z.string().or(z.number()).transform(val => String(val)).nullable().optional(), // USD por tonelada
  }),
  // Custos MAPA (Ministério da Agricultura)
  mapa: z.object({
    costPerTon: z.string().or(z.number()).transform(val => String(val)).nullable().optional(), // USD por tonelada
    acerto: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),     // USD por tonelada
    fixo: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),       // USD fixo
    lot1000: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),    // BRL para lotes até 1000 ton
    lot1500: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),    // BRL para lotes acima de 1000 ton
  }),
  // Custos de balsa (travessia)
  balsa: z.object({
    enabled: z.boolean().default(false),
    defaultCost: z.number().nullable().optional(),      // BRL custo padrão da balsa
    // Custos específicos por ponto (apenas para Santa Helena)
    puertoIndioCost: z.number().nullable().optional(),  // BRL custo para Puerto Indio
    sangaFundaCost: z.number().nullable().optional(),   // BRL custo para Sanga Funda
  }),
  // Custos de estacionamento
  estacionamento: z.object({
    enabled: z.boolean().default(false),
    costPerTruck: z.string().or(z.number()).transform(val => String(val)).nullable().optional(), // BRL por caminhão
  }),
  // Custos Dinatran
  dinatran: z.object({
    enabled: z.boolean().default(false),
    costPerTruck: z.string().or(z.number()).transform(val => String(val)).nullable().optional(), // BRL por caminhão
  }),
  // Comissão Luiz Baciquet
  comissaoLuiz: z.object({
    enabled: z.boolean().default(false),
    costPerTon: z.string().or(z.number()).transform(val => String(val)).nullable().optional(), // BRL por tonelada
  }),
  // Outras taxas específicas
  otherFees: z.record(z.any()).default({}),
  // Metadados
  createdAt: z.date().nullable().optional(),
  updatedAt: z.date().nullable().optional(),
});

export const insertCrossingPointSchema = crossingPointSchema.omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

// Mantendo os schemas antigos para compatibilidade
export const aduanaInfoSchema = legacyAduanaInfoSchema;
export const insertAduanaInfoSchema = legacyAduanaInfoSchema.omit({ id: true });

// Exportando tipos para o novo schema
export type InsertAduanaInfo = z.infer<typeof insertAduanaInfoSchema>;
export type AduanaInfo = z.infer<typeof aduanaInfoSchema>;
export type InsertCrossingPoint = z.infer<typeof insertCrossingPointSchema>;
export type CrossingPoint = z.infer<typeof crossingPointSchema>;

// Exchange Rate Schema
export const exchangeRateSchema = z.object({
  id: z.string().optional(),
  usdToBrl: z.string().or(z.number()).transform(val => String(val)),
  usdToGs: z.string().or(z.number()).transform(val => String(val)),
  updatedAt: z.date().nullable().optional(),
});

export const insertExchangeRateSchema = exchangeRateSchema.omit({ id: true, updatedAt: true });
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = z.infer<typeof exchangeRateSchema>;

// Client Schema
export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  documentType: z.enum(['CNPJ', 'CPF', 'RUC', 'CI']).optional(),
  documentNumber: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('BR'),
  notes: z.string().optional(),
  createdAt: z.date().nullable().optional(),
  updatedAt: z.date().nullable().optional(),
});

export const insertClientSchema = clientSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = z.infer<typeof clientSchema>;

// Relation between clients and quotes
export const clientQuoteSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  quoteId: z.string(),
  createdAt: z.date().nullable().optional(),
});

export const insertClientQuoteSchema = clientQuoteSchema.omit({ id: true, createdAt: true });
export type InsertClientQuote = z.infer<typeof insertClientQuoteSchema>;
export type ClientQuote = z.infer<typeof clientQuoteSchema>;

// Exportando variáveis com nomes compatíveis com o código existente
// para evitar necessidade de mudar muitas partes do código
export const users = { schema: userSchema };
export const freightQuotes = { schema: freightQuoteSchema };
export const aduanaInfo = { schema: aduanaInfoSchema };
export const crossingPoints = { schema: crossingPointSchema };
export const exchangeRates = { schema: exchangeRateSchema };
export const systemConfig = { schema: systemConfigSchema };
export const appSettings = { schema: appSettingsSchema };
export const clients = { schema: clientSchema };
export const clientQuotes = { schema: clientQuoteSchema };
