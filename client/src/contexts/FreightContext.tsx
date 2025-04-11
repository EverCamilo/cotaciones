import { createContext, ReactNode, useContext, useState } from "react";
import { apiRequest, queryClient } from "../lib/queryClient";

export type ProductType = 'grains' | 'processed' | 'electronics' | 'textiles' | 'other' | 'select_default';

export interface AduanaDetails {
  name: string;
  country: string;
  partnerAduana: string;
  distance?: number;
  costPerTon?: number;
  costPerTonWithFreight?: number; // Custo por tonelada incluindo frete base (para comparação)
  hasBalsa: boolean;
  balsaCost?: number | Record<string, number>;
  total?: number;
  totalWithFreight?: number; // Custo total incluindo frete base (para comparação)
  isRecommended?: boolean;
}

export interface CostItem {
  item: string;
  details: string;
  value: number;
  isReferenceOnly?: boolean;
}

export interface FreightQuote {
  // Metadata
  id?: string;
  createdAt?: string;
  departureDate?: string;
  
  // Client information
  clientId?: string;
  clientName?: string;
  
  origin: string;
  originCity?: string; // Cidade de origem simplificada
  originPlaceId?: string;
  originLat?: string;      // Latitude da origem para envio ao backend
  originLng?: string;      // Longitude da origem para envio ao backend
  originCoordinates?: { lat: number; lng: number } | null; // Para armazenamento local
  destination: string;
  destinationCity?: string; // Cidade de destino simplificada
  destinationPlaceId?: string;
  destinationLat?: string; // Latitude do destino para envio ao backend
  destinationLng?: string; // Longitude do destino para envio ao backend
  destLat?: string;       // Nome alternativo da latitude do destino (para compatibilidade com ML)
  destLng?: string;       // Nome alternativo da longitude do destino (para compatibilidade com ML)
  destinationCoordinates?: { lat: number; lng: number } | null; // Para armazenamento local
  productType: ProductType | '';
  specificProduct?: string;
  productPrice?: number;
  tonnage: number;
  driverPayment: number;
  profitMargin: number;
  merchandiseValue: number;
  aduanaBr?: string; // Aduana brasileira selecionada para cálculo
  
  // Flags especiais para garantir que as preferências do usuário sejam respeitadas
  _forceAduana?: boolean; // Flag para forçar o uso da aduana selecionada
  _selectedAduana?: string; // Aduana escolhida explicitamente pelo usuário
  _forceBalsaPayment?: boolean; // Flag para forçar o pagamento da balsa pela empresa
  
  // Results
  recommendedAduana?: string;
  totalCost?: number;
  costPerTon?: number;
  baseCostPerTon?: number; // Custo base por tonelada (sem margem)
  marginPerTon?: number;
  totalDistance?: number;
  requiredTrucks?: number;
  exchangeRate?: number;
  estimatedProfit?: number;
  
  // Informações adicionais retornadas pelo servidor
  freightBaseInfo?: {
    value: number;
    details: string;
    description: string;
  };
  actualFreightInput?: {
    currencyCode: string;
    description: string;
  };
  
  customsDetails?: {
    originLocation?: string;
    destinationLocation?: string;
    customsPoint?: string;
    preferredAduana?: string;
    includeInsurance?: boolean;
    specialHandling?: boolean;
    customsProcess?: string;
    additionalNotes?: string;
    companyPaysBalsa?: boolean; // Indica se a empresa paga a balsa (true) ou se o motorista paga (false)
  };
  routeSegments?: {
    originToCustoms?: number;
    customsToDestination?: number;
    crossingDistance?: number;
  };
  costBreakdown?: CostItem[];
  aduanaComparison?: AduanaDetails[];

  // Machine Learning features
  distance?: number; // Distância total para uso no modelo ML
  usingMLRecommendation?: boolean; // Flag indicando se está usando recomendação do ML
  mlRecommendedPrice?: number; // Preço recomendado pelo modelo ML
  mlRecommendationApplied?: boolean; // Flag indicando se a recomendação foi aplicada
}

interface FreightContextType {
  freightQuote: FreightQuote;
  updateFreightQuote: (data: Partial<FreightQuote>) => void;
  resetFreightQuote: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  calculateFreight: () => Promise<void>;
  isCalculating: boolean;
  error: string | null;
  saveQuote: () => Promise<void>;
  isSaving: boolean;
}

const defaultFreightQuote: FreightQuote = {
  // Client information
  clientId: '',
  clientName: '',
  
  origin: '',
  originCity: '',
  originPlaceId: '',
  originLat: '',
  originLng: '',
  originCoordinates: null,
  destination: '',
  destinationCity: '',
  destinationPlaceId: '',
  destinationLat: '',
  destinationLng: '',
  destLat: '',        // Campo alternativo para compatibilidade ML
  destLng: '',        // Campo alternativo para compatibilidade ML
  destinationCoordinates: null,
  productType: '',
  specificProduct: '',
  productPrice: 0,
  tonnage: 1000, // Valor padrão definido para 1000 toneladas
  driverPayment: 0,
  profitMargin: 4, // Valor padrão definido para $4 USD por tonelada
  merchandiseValue: 0,
  aduanaBr: '', // Aduana brasileira selecionada para cálculo
  
  // Valores de cálculo
  baseCostPerTon: 0,
  
  customsDetails: {
    companyPaysBalsa: false // Por padrão, o motorista paga a balsa
  }
};

const FreightContext = createContext<FreightContextType | null>(null);

export const FreightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [freightQuote, setFreightQuote] = useState<FreightQuote>(defaultFreightQuote);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const updateFreightQuote = (data: Partial<FreightQuote>) => {
    setFreightQuote((prev) => ({ ...prev, ...data }));
  };

  const resetFreightQuote = () => {
    setFreightQuote(defaultFreightQuote);
    setCurrentStep(1);
    setError(null);
  };

  const calculateFreight = async () => {
    try {
      setIsCalculating(true);
      setError(null);
      
      // SOLUÇÃO FINAL DEFINITIVA:
      // 1. Ver se temos valores críticos definidos globalmente pelo DetailedInfoForm
      // 2. Se existirem, usá-los DIRETAMENTE
      // 3. Caso contrário, usar as configurações do FreightQuote
      
      // Verificar se temos valores críticos definidos
      const criticalValues = (window as any).__CRITICAL_VALUES__;
      
      // Criar objeto para enviar ao servidor
      // Usamos any para evitar erros de TypeScript e ter mais flexibilidade
      const dataToSend: any = {
        // Cliente
        clientId: freightQuote.clientId,
        clientName: freightQuote.clientName,
        
        // Dados básicos
        origin: freightQuote.origin,
        originPlaceId: freightQuote.originPlaceId,
        originLat: freightQuote.originCoordinates?.lat.toString(),
        originLng: freightQuote.originCoordinates?.lng.toString(),
        destination: freightQuote.destination,
        destinationPlaceId: freightQuote.destinationPlaceId,
        destinationLat: freightQuote.destinationCoordinates?.lat.toString(), 
        destinationLng: freightQuote.destinationCoordinates?.lng.toString(),
        // Campos adicionais para compatibilidade com o serviço ML
        destLat: freightQuote.destinationCoordinates?.lat.toString(),
        destLng: freightQuote.destinationCoordinates?.lng.toString(),
        tonnage: freightQuote.tonnage,
        productType: freightQuote.productType,
        specificProduct: freightQuote.specificProduct,
        productPrice: freightQuote.productPrice,
        driverPayment: freightQuote.driverPayment,
        profitMargin: freightQuote.profitMargin,
        merchandiseValue: freightQuote.merchandiseValue,
        
        // Flags especiais - inicializadas com valores padrão
        _forceAduana: false,
        _selectedAduana: undefined as string | undefined,
        _forceBalsaPayment: false,
        
        // CustomsDetails - sempre mantemos os originais
        customsDetails: freightQuote.customsDetails || {
          includeInsurance: true,
          specialHandling: false,
          customsProcess: 'normal',
          companyPaysBalsa: false,
          preferredAduana: 'auto'
        }
      };
      
      // SOLUÇÃO FINAL: Se temos valores críticos definidos globalmente,
      // usamos eles DIRETAMENTE, ignorando o que está no contexto
      if (criticalValues) {
        console.log(`🔥 ENCONTRAMOS VALORES CRÍTICOS DEFINIDOS GLOBALMENTE 🔥`);
        console.log(criticalValues);
        
        // Aplicar as flags críticas - estas são as mais importantes
        dataToSend._forceAduana = criticalValues.forceAduana;
        dataToSend._selectedAduana = criticalValues.selectedAduana;
        dataToSend._forceBalsaPayment = criticalValues.forceBalsaPayment;
        
        // Atualizar o customsDetails também para garantir coerência
        if (dataToSend.customsDetails) {
          if (criticalValues.forceAduana && criticalValues.selectedAduana) {
            dataToSend.customsDetails.preferredAduana = criticalValues.selectedAduana;
          }
          
          if (criticalValues.forceBalsaPayment) {
            dataToSend.customsDetails.companyPaysBalsa = true;
          }
        }
        
        console.log(`✅ FLAGS CRÍTICAS APLICADAS DIRETAMENTE DO OBJETO GLOBAL`);
      } else {
        // Se não encontramos valores críticos, usamos a lógica anterior
        console.log(`⚠️ NENHUM VALOR CRÍTICO ENCONTRADO, USANDO CONFIGURAÇÕES DO CONTEXTO`);
        
        // Definir flags com base no customsDetails atual
        const preferredAduana = dataToSend.customsDetails?.preferredAduana;
        const companyPaysBalsa = dataToSend.customsDetails?.companyPaysBalsa === true;
        
        // Configurar flags especiais
        dataToSend._forceAduana = preferredAduana !== 'auto' && !!preferredAduana;
        dataToSend._selectedAduana = dataToSend._forceAduana ? preferredAduana : undefined;
        dataToSend._forceBalsaPayment = companyPaysBalsa;
      }
      
      // LOG FINAL dos dados que serão enviados
      console.log("==============================================================");
      console.log("🔍 DADOS FINAIS PARA ENVIO AO SERVIDOR (DEFINITIVOS):");
      console.log(`🔸 Origin: ${dataToSend.origin}`);
      console.log(`🔸 Destination: ${dataToSend.destination}`);
      console.log(`🔸 Tonnage: ${dataToSend.tonnage}`);
      console.log(`🔸 Aduana forçada: ${dataToSend._forceAduana ? 'SIM' : 'NÃO'}`);
      console.log(`🔸 Aduana selecionada: ${dataToSend._selectedAduana || 'NENHUMA (automático)'}`);
      console.log(`🔸 Empresa paga balsa: ${dataToSend._forceBalsaPayment ? 'SIM' : 'NÃO'}`);
      console.log(`🔸 CustomsDetails:`, JSON.stringify(dataToSend.customsDetails, null, 2));
      console.log("==============================================================");
      
      // Usar fetch direta para garantir controle total dos dados enviados
      const response = await fetch('/api/freight/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      const result = await response.json();
      console.log("Resultado do cálculo:", JSON.stringify(result, null, 2));
      
      // Log para depuração
      console.log("Preferências do usuário que DEVEM ser preservadas:", {
        includeInsurance: freightQuote.customsDetails?.includeInsurance,
        specialHandling: freightQuote.customsDetails?.specialHandling,
        customsProcess: freightQuote.customsDetails?.customsProcess,
        companyPaysBalsa: freightQuote.customsDetails?.companyPaysBalsa,
        preferredAduana: freightQuote.customsDetails?.preferredAduana,
        forceAduana: dataToSend._forceAduana,
        selectedAduana: dataToSend._selectedAduana
      });
      
      // Extrair cidade da origem e destino (primeiro termo antes da vírgula)
      const originCity = freightQuote.origin.split(',')[0].trim();
      const destinationCity = freightQuote.destination.split(',')[0].trim();
      
      // Atualizamos apenas os dados de cálculo
      const updatedData: Partial<FreightQuote> = {
        // Incluir informações de localização simplificadas para uso em relatórios
        originCity,
        destinationCity,
      };
      
      // Dados básicos do cálculo
      if (result.recommendedAduana) updatedData.recommendedAduana = result.recommendedAduana;
      if (result.totalCost !== undefined) updatedData.totalCost = result.totalCost;
      if (result.costPerTon !== undefined) updatedData.costPerTon = result.costPerTon;
      
      // Calcular e armazenar o custo base (sem a margem)
      if (result.costPerTon !== undefined && result.marginPerTon !== undefined) {
        updatedData.baseCostPerTon = result.costPerTon - result.marginPerTon;
      }
      
      if (result.marginPerTon !== undefined) updatedData.marginPerTon = result.marginPerTon;
      if (result.totalDistance !== undefined) updatedData.totalDistance = result.totalDistance;
      if (result.requiredTrucks !== undefined) updatedData.requiredTrucks = result.requiredTrucks;
      if (result.exchangeRate !== undefined) updatedData.exchangeRate = result.exchangeRate;
      if (result.estimatedProfit !== undefined) updatedData.estimatedProfit = result.estimatedProfit;
      if (result.costBreakdown) updatedData.costBreakdown = result.costBreakdown;
      if (result.aduanaComparison) updatedData.aduanaComparison = result.aduanaComparison;
      if (result.routeSegments) updatedData.routeSegments = result.routeSegments;
      
      // Preservamos customsDetails para manter as escolhas do usuário
      if (freightQuote.customsDetails) {
        updatedData.customsDetails = {
          ...freightQuote.customsDetails,
          // Atualizamos apenas as informações calculadas, não as seleções do usuário
          originLocation: result.customsDetails?.originLocation,
          destinationLocation: result.customsDetails?.destinationLocation,
          customsPoint: result.customsDetails?.customsPoint
        };
      }
      
      // Log para verificar o que estamos preservando
      console.log("Configurações de usuário preservadas:", {
        preferredAduana: updatedData.customsDetails?.preferredAduana,
        companyPaysBalsa: updatedData.customsDetails?.companyPaysBalsa
      });
      
      // Atualizar o estado
      updateFreightQuote(updatedData);
      setCurrentStep(3); // Move to results step
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error calculating freight');
      console.error('Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const saveQuote = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      await apiRequest("POST", "/api/freight/save", freightQuote);
      
      // Invalidar as consultas de histórico para forçar o React Query a buscar dados novos
      // após salvar uma nova cotação
      queryClient.invalidateQueries({ queryKey: ['/api/freight/history'] });
      console.log('🔄 Consulta de histórico invalidada após salvar cotação');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving quote');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FreightContext.Provider
      value={{
        freightQuote,
        updateFreightQuote,
        resetFreightQuote,
        currentStep,
        setCurrentStep,
        calculateFreight,
        isCalculating,
        error,
        saveQuote,
        isSaving
      }}
    >
      {children}
    </FreightContext.Provider>
  );
};

export const useFreight = () => {
  const context = useContext(FreightContext);
  if (!context) {
    throw new Error('useFreight must be used within a FreightProvider');
  }
  return context;
};
