import { useEffect, useState, useRef } from "react";
import { useFreight } from "../../contexts/FreightContext";
import { ProductType } from "../../contexts/FreightContext";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { MapPin, MapPinOff, ChevronRight, X, Truck, DollarSign, Package, ArrowRight, AlertCircle, RefreshCw, HelpCircle, Compass, CheckCircle, Brain } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { allProducts } from "../../utils/productPrices";
import MapPointSelector from "./MapPointSelector";
import { apiRequest } from "../../lib/queryClient";
import MLRecommendationButton from "../MLRecommendationButton";

// Interfaces para tipagem da API do Google Places
interface PlaceDetails {
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    }
  };
  formatted_address?: string;
}

// Função para buscar detalhes de um lugar pelo place_id
const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
  try {
    console.log(`Buscando detalhes para placeId: ${placeId}`);
    
    // Utilizamos a API interna do sistema para obter os detalhes do lugar
    // Isso evita expor a API key do Google no frontend e centraliza as requisições
    // Importante: o backend espera o parâmetro como place_id (não placeId)
    const response = await fetch(`/api/places/details?place_id=${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar detalhes do lugar: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Detalhes recebidos do lugar:", placeId, data);
    
    // Formato direto já retornado pelo backend, sem result aninhado
    if (!data || (!data.coordinates && !data.geometry)) {
      console.warn("Dados recebidos da API não contêm coordenadas válidas:", data);
      return null;
    }
    
    // Construir objeto formatado conforme interface PlaceDetails
    const details: PlaceDetails = {
      formatted_address: data.address || data.formatted_address || '',
      geometry: {
        location: data.coordinates || data.geometry?.location || { lat: 0, lng: 0 }
      }
    };
    
    console.log("Detalhes processados para coordenadas:", details);
    return details;
  } catch (error) {
    console.error("Erro ao buscar detalhes do lugar:", error);
    return null;
  }
};

// Categorias de produtos
const productOptions = [
  { value: 'grains', label: 'Grãos (Soja, Milho, Trigo)' },
  { value: 'processed', label: 'Alimentos Processados' },
  { value: 'electronics', label: 'Eletrônicos' },
  { value: 'textiles', label: 'Têxteis' },
  { value: 'other', label: 'Outros' }
];

// Produtos específicos organizados por categoria
const specificProductOptions = {
  grains: allProducts.filter(p => p.category === 'grains').map(p => ({
    value: p.name.toLowerCase(),
    label: p.name,
    price: p.price,
    description: p.description
  })),
  processed: [],
  electronics: [],
  textiles: [],
  other: []
};

interface Place {
  description: string;
  place_id: string;
}

const BasicInfoForm = () => {
  const { freightQuote, updateFreightQuote, setCurrentStep } = useFreight();
  const { toast } = useToast();
  
  // Estados para o cliente
  const [clientNameInput, setClientNameInput] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);
  
  const [origin, setOrigin] = useState(freightQuote.origin || '');
  const [originInput, setOriginInput] = useState('');
  const [originPlaceId, setOriginPlaceId] = useState(freightQuote.originPlaceId || '');
  const [isOriginPopoverOpen, setIsOriginPopoverOpen] = useState(false);
  const [isOriginMapSelectorOpen, setIsOriginMapSelectorOpen] = useState(false);
  const [originCoordinates, setOriginCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const [destination, setDestination] = useState(freightQuote.destination || '');
  const [destinationInput, setDestinationInput] = useState('');
  const [destinationPlaceId, setDestinationPlaceId] = useState(freightQuote.destinationPlaceId || '');
  const [isDestinationPopoverOpen, setIsDestinationPopoverOpen] = useState(false);
  const [isDestinationMapSelectorOpen, setIsDestinationMapSelectorOpen] = useState(false);
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const [productType, setProductType] = useState<ProductType>(freightQuote.productType || '' as ProductType);
  const [specificProduct, setSpecificProduct] = useState(freightQuote.specificProduct || '');
  const [tonnage, setTonnage] = useState<number | ''>(freightQuote.tonnage || '');
  const [driverPayment, setDriverPayment] = useState<number | ''>(freightQuote.driverPayment || '');
  const [profitMargin, setProfitMargin] = useState<number | ''>(freightQuote.profitMargin || '');
  const [merchandiseValue, setMerchandiseValue] = useState<number | ''>(freightQuote.merchandiseValue || '');
  const [aduanaBr, setAduanaBr] = useState<string>(freightQuote.aduanaBr || '');
  // Data automática para ML sem interface de usuário
  const departureDate = format(new Date(), 'yyyy-MM-dd');

  const originTimeoutRef = useRef<number | null>(null);
  const destinationTimeoutRef = useRef<number | null>(null);
  
  // Estado para armazenar as configurações do sistema
  const [appSettings, setAppSettings] = useState<{
    defaultTonnage: number;
    defaultProfitMargin: number;
    notifications: boolean;
    darkMode: boolean;
  }>({
    defaultTonnage: 1000,
    defaultProfitMargin: 4.0,
    notifications: true,
    darkMode: false
  });
  
  // Buscar configurações padrão
  useEffect(() => {
    const fetchDefaultSettings = async () => {
      try {
        // Adicionando timestamp para evitar cache
        const timestamp = Date.now();
        const response = await apiRequest('GET', `/api/app-settings?_=${timestamp}`);
        const data = await response.json();
        
        console.log('Configurações carregadas com sucesso:', data);
        
        // Armazenar configurações para uso posterior no componente
        setAppSettings({
          defaultTonnage: data.defaultTonnage || 1000,
          defaultProfitMargin: data.defaultProfitMargin || 4.0,
          notifications: data.notifications ?? true,
          darkMode: data.darkMode || false
        });
        
        // Sempre atualizar a tonelagem e margem de lucro com valores do servidor
        // Removida a verificação de "!tonnage" para sempre usar o valor padrão definido nas configurações
        const defaultTonnage = data.defaultTonnage || 1000;
        setTonnage(defaultTonnage);
        updateFreightQuote({ tonnage: defaultTonnage });
        
        const defaultProfitMargin = data.defaultProfitMargin || 4.0;
        setProfitMargin(defaultProfitMargin);
        updateFreightQuote({ profitMargin: defaultProfitMargin });
        
        console.log('Aplicando valores padrão:', { tonnage: defaultTonnage, profitMargin: defaultProfitMargin });
      } catch (error) {
        console.error('Erro ao carregar configurações padrão:', error);
        // Usar valores padrão caso haja falha
        if (!tonnage) {
          setTonnage(1000);
          updateFreightQuote({ tonnage: 1000 });
        }
        
        if (!profitMargin) {
          setProfitMargin(4.0);
          updateFreightQuote({ profitMargin: 4.0 });
        }
      }
    };
    
    fetchDefaultSettings();
  }, []);
  
  // Busca da lista de clientes
  const { data: clients, isLoading: isLoadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
          throw new Error('Failed to fetch clients');
        }
        return response.json();
      } catch (error) {
        console.error('Error loading clients:', error);
        return [];
      }
    }
  });

  // Função para criar um novo cliente
  const handleCreateClient = async () => {
    if (!clientNameInput.trim()) {
      toast({
        title: "Nome do cliente é obrigatório",
        description: "Por favor, informe o nome do cliente para continuar.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setIsCreatingClient(true);
    
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: clientNameInput.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create client');
      }

      const newClient = await response.json();
      
      // Atualizar o contexto com o cliente criado
      updateFreightQuote({
        clientId: newClient.id,
        clientName: newClient.name
      });

      // Limpar o campo e atualizar a lista
      setClientNameInput('');
      setShowClientForm(false);
      await refetchClients();
      
      toast({
        title: "Cliente criado com sucesso",
        description: `O cliente "${newClient.name}" foi adicionado à lista.`,
        duration: 3000
      });
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Erro ao criar cliente",
        description: "Ocorreu um erro ao criar o cliente. Tente novamente.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Manipula a seleção de cliente
  const handleSelectClient = (clientId: string, clientName: string) => {
    updateFreightQuote({ 
      clientId,
      clientName
    });
    setShowClientForm(false);
    setIsClientPopoverOpen(false); // Fecha o popover quando um cliente é selecionado
  };

  // Busca de lugares para origem (restrito ao Paraguai)
  const { data: originPlaces, isFetching: isOriginLoading } = useQuery<Place[]>({
    queryKey: [`/api/places/search`, originInput, 'py'],
    queryFn: async () => {
      if (originInput.length < 3) return [];
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(originInput)}&country=py`);
      return response.json();
    },
    enabled: originInput.length > 2,
    staleTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false
  });

  // Busca de lugares para destino (restrito ao Brasil)
  const { data: destinationPlaces, isFetching: isDestinationLoading } = useQuery<Place[]>({
    queryKey: [`/api/places/search`, destinationInput, 'br'],
    queryFn: async () => {
      if (destinationInput.length < 3) return [];
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(destinationInput)}&country=br`);
      return response.json();
    },
    enabled: destinationInput.length > 2,
    staleTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false
  });

  // Manipula a entrada do usuário para o campo de origem
  const handleOriginInputChange = (value: string) => {
    setOriginInput(value);
    setIsOriginPopoverOpen(true);

    // Limpar o timeout anterior se existir
    if (originTimeoutRef.current) {
      window.clearTimeout(originTimeoutRef.current);
    }

    // Configurar um novo timeout para evitar muitas requisições
    originTimeoutRef.current = window.setTimeout(() => {
      // Se o valor for menor que 3 caracteres, não faz a requisição
      if (value.length < 3) {
        setIsOriginPopoverOpen(false);
      }
    }, 300);
  };

  // Manipula a entrada do usuário para o campo de destino
  const handleDestinationInputChange = (value: string) => {
    setDestinationInput(value);
    setIsDestinationPopoverOpen(true);

    // Limpar o timeout anterior se existir
    if (destinationTimeoutRef.current) {
      window.clearTimeout(destinationTimeoutRef.current);
    }

    // Configurar um novo timeout para evitar muitas requisições
    destinationTimeoutRef.current = window.setTimeout(() => {
      // Se o valor for menor que 3 caracteres, não faz a requisição
      if (value.length < 3) {
        setIsDestinationPopoverOpen(false);
      }
    }, 300);
  };

  // Seleciona um lugar de origem da lista
  const selectOriginPlace = (place: Place) => {
    console.log("Selecionado origem:", place.description, place.place_id);
    
    // Primeiro atualizamos os estados locais imediatamente
    setOrigin(place.description);
    setOriginInput('');
    setIsOriginPopoverOpen(false);
    setOriginPlaceId(place.place_id); // Atualizamos o place_id imediatamente
    
    // Obter coordenadas imediatamente usando a API do Google Places
    if (place.place_id) {
      console.log("Buscando detalhes para origem via API do Google Places:", place.place_id);
      
      // Usar o endpoint interno do backend para obter detalhes do lugar
      fetch(`/api/places/details?place_id=${encodeURIComponent(place.place_id)}`)
        .then(response => response.json())
        .then(data => {
          console.log("Resposta da API Places para origem:", data);
          
          // Verificar se temos dados válidos e coordenadas
          // A API pode retornar as coordenadas em data.geometry.location (formato Google) ou diretamente em data.coordinates (formato interno)
          if (data && data.coordinates) {
            const location = data.coordinates;
            console.log("Coordenadas obtidas para origem:", location);
            
            // Atualizar estados locais
            setOriginCoordinates({ lat: location.lat, lng: location.lng });
            
            // Atualizar contexto global com campos adicionais para compatibilidade com ML
            updateFreightQuote({
              originLat: location.lat.toString(),
              originLng: location.lng.toString(),
              // Campos adicionais podem ser necessários no futuro para compatibilidade com ML
              originCoordinates: { lat: location.lat, lng: location.lng }
            });
          } else {
            console.error("API Places não retornou coordenadas válidas para origem:", data);
            setOriginCoordinates(null);
          }
        })
        .catch(err => {
          console.error("Erro ao obter coordenadas de origem:", err);
          setOriginCoordinates(null);
        });
    } else {
      console.warn("Sem place_id para obter coordenadas de origem");
      setOriginCoordinates(null);
    }
    
    // Atualizar o context global com o lugar selecionado
    updateFreightQuote({
      origin: place.description,
      originPlaceId: place.place_id
    });
  };
  
  // Abre o seletor de ponto no mapa para origem
  const openOriginMapSelector = () => {
    setIsOriginMapSelectorOpen(true);
  };
  
  // Trata a seleção de um ponto no mapa para origem
  const handleOriginMapSelection = (data: { lat: number; lng: number; address: string }) => {
    console.log("Selecionado ponto de origem no mapa:", data);
    
    setOrigin(data.address);
    setOriginInput('');
    setOriginPlaceId(''); // Não temos place_id quando selecionamos no mapa
    setOriginCoordinates({ lat: data.lat, lng: data.lng });
    
    // Atualizar o context global com as coordenadas e outras informações
    updateFreightQuote({
      origin: data.address,
      originPlaceId: '',
      originLat: data.lat.toString(),
      originLng: data.lng.toString(),
      // Não são necessários campos adicionais para origem no ML atualmente
      originCoordinates: { lat: data.lat, lng: data.lng }
    });
    
    toast({
      title: "Origem selecionada no mapa",
      description: "Local de origem definido manualmente no mapa.",
      variant: "default",
      duration: 3000
    });
  };

  // Seleciona um lugar de destino da lista e verifica se pode recomendar aduana
  const selectDestinationPlace = (place: Place) => {
    console.log("Selecionado destino:", place.description, place.place_id);
    
    // Primeiro atualizamos os estados locais imediatamente
    setDestination(place.description);
    setDestinationInput('');
    setIsDestinationPopoverOpen(false);
    setDestinationPlaceId(place.place_id); // Atualizamos o place_id imediatamente, sem atraso
    
    // Obter coordenadas imediatamente usando a API do Google Places
    if (place.place_id) {
      console.log("Buscando detalhes para destino via API do Google Places:", place.place_id);
      
      // Usar o endpoint interno do backend para obter detalhes do lugar
      fetch(`/api/places/details?place_id=${encodeURIComponent(place.place_id)}`)
        .then(response => response.json())
        .then(data => {
          console.log("Resposta da API Places para destino:", data);
          
          // Verificar se temos dados válidos e coordenadas
          // A API pode retornar as coordenadas em data.geometry.location (formato Google) ou diretamente em data.coordinates (formato interno)
          if (data && data.coordinates) {
            const location = data.coordinates;
            console.log("Coordenadas obtidas para destino:", location);
            
            // Atualizar estados locais
            setDestinationCoordinates({ lat: location.lat, lng: location.lng });
            
            // Atualizar contexto global
            updateFreightQuote({
              destinationLat: location.lat.toString(),
              destinationLng: location.lng.toString(),
              // Campos adicionais para compatibilidade com o serviço ML
              destLat: location.lat.toString(),
              destLng: location.lng.toString(),
              destinationCoordinates: { lat: location.lat, lng: location.lng }
            });
          } else {
            console.error("API Places não retornou coordenadas válidas para destino:", data);
            setDestinationCoordinates(null);
          }
        })
        .catch(err => {
          console.error("Erro ao obter coordenadas de destino:", err);
          setDestinationCoordinates(null);
        });
    } else {
      console.warn("Sem place_id para obter coordenadas de destino");
      setDestinationCoordinates(null);
    }
    
    // Atualizar o context global com o lugar selecionado
    updateFreightQuote({
      destination: place.description,
      destinationPlaceId: place.place_id
    });
    
    // Removida a mensagem de carregamento desnecessária
    
    // Definimos um estado para indicar que o processo está completo
    setIsLoadingRecommendation(false);
    
    // Se já temos origem e destino, notificamos o usuário que pode solicitar a recomendação
    if (origin) {
      console.log("Seleção de destino completa, pronto para recomendar aduana");
      
      // Limpa qualquer timeout anterior para evitar chamadas duplicadas
      if (destinationTimeoutRef.current) {
        window.clearTimeout(destinationTimeoutRef.current);
      }
      
      // Notificamos o usuário que pode usar o botão 
      toast({
        title: "Locais selecionados",
        description: "Clique no botão 'Recomendar Aduana' que aparece abaixo para obter a melhor rota.",
        variant: "default",
        duration: 4000
      });
    } else {
      console.log("Falta selecionar a origem");
      
      toast({
        title: "Selecione a origem",
        description: "Selecione também um local de origem no Paraguai para continuar.",
        variant: "default",
        duration: 3000
      });
    }
  };
  
  // Abre o seletor de ponto no mapa para destino
  const openDestinationMapSelector = () => {
    setIsDestinationMapSelectorOpen(true);
  };
  
  // Trata a seleção de um ponto no mapa para destino
  const handleDestinationMapSelection = (data: { lat: number; lng: number; address: string }) => {
    console.log("Selecionado ponto de destino no mapa:", data);
    
    setDestination(data.address);
    setDestinationInput('');
    setDestinationPlaceId(''); // Não temos place_id quando selecionamos no mapa
    setDestinationCoordinates({ lat: data.lat, lng: data.lng });
    
    // Atualizar o context global com as coordenadas e outras informações
    updateFreightQuote({
      destination: data.address,
      destinationPlaceId: '',
      destinationLat: data.lat.toString(),
      destinationLng: data.lng.toString(),
      // Campos adicionais para compatibilidade com o serviço ML
      destLat: data.lat.toString(),
      destLng: data.lng.toString(),
      destinationCoordinates: { lat: data.lat, lng: data.lng }
    });
    
    toast({
      title: "Destino selecionado no mapa",
      description: "Local de destino definido manualmente no mapa.",
      variant: "default",
      duration: 3000
    });
    
    // Se já temos origem, notificamos o usuário que pode solicitar a recomendação
    if (origin) {
      toast({
        title: "Locais selecionados",
        description: "Clique no botão 'Recomendar Aduana' que aparece abaixo para obter a melhor rota.",
        variant: "default",
        duration: 4000
      });
    }
  };
  
  // Busca recomendação de aduana após selecionar origem e destino
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [recommendedAduana, setRecommendedAduana] = useState<{name: string, details: any} | null>(null);
  
  const fetchAduanaRecommendation = async (originId: string, destinationId: string) => {
    if (!origin || !destination) {
      console.error("❌ Erro: Origem ou destino não estão definidos");
      toast({
        title: "Não foi possível recomendar aduana",
        description: "Selecione origem e destino antes de solicitar a recomendação.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    // Verificamos se temos place IDs ou coordenadas para usar
    const hasValidPlaceIds = !!(originId && originId.trim() !== '' && destinationId && destinationId.trim() !== '');
    const hasValidCoordinates = !!(originCoordinates && destinationCoordinates);
    
    if (!hasValidPlaceIds && !hasValidCoordinates) {
      console.warn("⚠️ Nem Place IDs nem coordenadas disponíveis. Usando nomes dos lugares:", origin, destination);
      
      // Continuamos mesmo sem dados precisos de localização
      toast({
        title: "Usando localização aproximada",
        description: "Calculando com base nos nomes dos locais. A precisão pode ser menor.",
        variant: "default",
        duration: 3000
      });
      
      // Preenchemos com strings vazias para evitar erros
      originId = originId || '';
      destinationId = destinationId || '';
    } else if (!hasValidPlaceIds && hasValidCoordinates) {
      console.log("🌍 Usando coordenadas para cálculo de distância em vez de Place IDs");
      
      toast({
        title: "Usando coordenadas",
        description: "Calculando com base nas coordenadas selecionadas no mapa.",
        variant: "default",
        duration: 3000
      });
      
      // Preenchemos com strings vazias para evitar erros
      originId = originId || '';
      destinationId = destinationId || '';
    }
    
    try {
      setIsLoadingRecommendation(true);
      console.log(`Solicitando recomendação para origem=${origin} (ID: ${originId}) e destino=${destination} (ID: ${destinationId})`);
      
      // Usamos o endpoint GET para recomendação de aduana usando o mesmo algoritmo do cálculo completo
      // Isso garante que a recomendação seja consistente com o cálculo final
      const companyPaysBalsa = false; // Para garantir compatibilidade com o cálculo final
      const tonnage = 1000; // Valor padrão para recomendação
      
      // Garantir que os place IDs nunca sejam undefined ou null
      const safeOriginId = originId.trim();
      const safeDestinationId = destinationId.trim();
      
      // Construímos a URL com timestamp para evitar cache
      const timestamp = new Date().getTime();
      let url = `/api/freight/recommend-aduana?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&tonnage=${tonnage}&originPlaceId=${encodeURIComponent(safeOriginId)}&destinationPlaceId=${encodeURIComponent(safeDestinationId)}&companyPaysBalsa=${companyPaysBalsa}&_=${timestamp}`;
      
      // Adiciona parâmetros de coordenadas se disponíveis
      if (originCoordinates) {
        url += `&originLat=${originCoordinates.lat}&originLng=${originCoordinates.lng}`;
      }
      
      if (destinationCoordinates) {
        url += `&destinationLat=${destinationCoordinates.lat}&destinationLng=${destinationCoordinates.lng}`;
      }
      
      console.log("URL de requisição:", url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error("Resposta não-OK do servidor:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Detalhes do erro:", errorText);
        throw new Error(`Erro ao obter recomendação de aduana: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log("Resposta completa do servidor:", data);
      
      if (data && data.recommendation) {
        console.log(`✅ Aduana recomendada: ${data.recommendation}`);
        
        // Calcular distância total a partir dos detalhes
        const distanciaTotal = data.distances && data.distances[data.recommendation] ? 
                              data.distances[data.recommendation] : 0;
        
        setRecommendedAduana({
          name: data.recommendation,
          details: { 
            ...data,
            totalDistance: distanciaTotal
          }
        });
        
        // Atualiza o formulário com a aduana recomendada
        setAduanaBr(data.recommendation);
        
        // Notificamos o usuário sobre a recomendação
        toast({
          title: "Aduana recomendada",
          description: `A melhor rota é via ${data.recommendation}. Custos calculados com base na distância total.`,
          variant: "default",
          duration: 4000
        });
      } else {
        console.warn('Nenhuma recomendação de aduana recebida', data);
        // Definimos a aduana recomendada como null para mostrar o alerta apropriado
        setRecommendedAduana(null);
        
        // Pré-selecionamos a opção de aduana mais comum para o usuário não ficar sem opção
        setAduanaBr('Foz do Iguaçu');
        
        toast({
          title: "Sem recomendação disponível",
          description: "Não foi possível determinar a melhor aduana. Foi selecionada a opção padrão.",
          variant: "destructive",
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Erro ao buscar recomendação de aduana:', error);
      setRecommendedAduana(null);
      
      toast({
        title: "Erro na recomendação",
        description: "Ocorreu um erro ao calcular a melhor aduana. Tente novamente ou selecione manualmente.",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  // Limpa a seleção de origem
  const clearOrigin = () => {
    setOrigin('');
    setOriginInput('');
    setOriginPlaceId('');
    setOriginCoordinates(null);
    
    // Também atualiza o context global
    updateFreightQuote({
      origin: '',
      originPlaceId: '',
      originLat: '',
      originLng: '',
      originCoordinates: null
    });
  };

  // Limpa a seleção de destino e limpa qualquer recomendação anterior
  const clearDestination = () => {
    setDestination('');
    setDestinationInput('');
    setDestinationPlaceId('');
    setDestinationCoordinates(null);
    
    // Limpa a recomendação de aduana quando o destino é removido
    setRecommendedAduana(null);
    
    // Também atualiza o context global
    updateFreightQuote({
      destination: '',
      destinationPlaceId: '',
      destinationLat: '',
      destinationLng: '',
      destLat: '',
      destLng: '',
      destinationCoordinates: null
    });
    
    // Informamos o usuário que a recomendação foi limpa
    toast({
      title: "Recomendação limpa",
      description: "A recomendação de aduana foi limpa. Por favor, selecione um novo destino.",
      variant: "default",
      duration: 3000
    });
  };
  
  const handleContinue = () => {
    // Obtém o preço do produto selecionado se houver
    let productPrice = 0;
    if (specificProduct) {
      const product = allProducts.find(p => p.name.toLowerCase() === specificProduct.toLowerCase());
      if (product) {
        productPrice = product.price;
      }
    }

    updateFreightQuote({
      // Dados do cliente
      clientId: freightQuote.clientId,
      clientName: freightQuote.clientName,
      
      // Dados da rota
      origin,
      originPlaceId,
      originLat: originCoordinates?.lat.toString(),
      originLng: originCoordinates?.lng.toString(),
      originCoordinates,
      destination,
      destinationPlaceId,
      destinationLat: destinationCoordinates?.lat.toString(),
      destinationLng: destinationCoordinates?.lng.toString(),
      // Campos adicionais para compatibilidade com o serviço ML
      destLat: destinationCoordinates?.lat.toString(),
      destLng: destinationCoordinates?.lng.toString(),
      destinationCoordinates,
      productType: productType as ProductType,
      specificProduct,
      productPrice,
      tonnage: typeof tonnage === 'number' ? tonnage : 1000, // Valor padrão 1000 toneladas
      driverPayment: typeof driverPayment === 'number' ? driverPayment : 0,
      // Margem de lucro padrão de $4 definida no FreightContext
      merchandiseValue: typeof merchandiseValue === 'number' ? merchandiseValue : 0,
      recommendedAduana: recommendedAduana?.name, // Incluímos a aduana recomendada se estiver disponível
      aduanaBr, // Adicionamos a aduana selecionada
      departureDate, // Data de saída para análise de sazonalidade
    });
    
    setCurrentStep(2);
  };
  
  const isFormValid = () => {
    // Validação básica
    const basicValidation = (
      // Exigir um cliente selecionado
      freightQuote.clientId && freightQuote.clientId.trim() !== '' &&
      
      origin !== '' &&
      destination !== '' &&
      productType !== undefined && productType !== null && productType !== 'select_default' &&
      tonnage !== '' && !isNaN(Number(tonnage)) && Number(tonnage) > 0 &&
      driverPayment !== '' && !isNaN(Number(driverPayment)) && Number(driverPayment) >= 0 &&
      merchandiseValue !== '' && !isNaN(Number(merchandiseValue)) && Number(merchandiseValue) >= 0
    );
    
    // Se o tipo de produto for 'grains', exige um produto específico
    if (productType === 'grains') {
      return basicValidation && specificProduct !== '' && specificProduct !== 'default_product';
    }
    
    return basicValidation;
  };

  return (
    <div className="space-y-6">
      {/* Seleção ou criação de cliente */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <Label htmlFor="client" className="font-medium text-neutral-800 dark:text-white">
            Cliente
          </Label>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowClientForm(!showClientForm)}
            className="text-xs"
          >
            {showClientForm ? "Selecionar cliente existente" : "Novo cliente"}
          </Button>
        </div>
        
        {showClientForm ? (
          <div className="space-y-2">
            <div className="flex">
              <Input
                id="clientName"
                placeholder="Nome do cliente..."
                value={clientNameInput}
                onChange={(e) => setClientNameInput(e.target.value)}
                className="flex-1"
                disabled={isCreatingClient}
              />
              <Button 
                type="button"
                className="ml-2" 
                onClick={handleCreateClient}
                disabled={isCreatingClient}
              >
                {isCreatingClient ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Criar"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between" 
                  disabled={isLoadingClients}
                  onClick={() => setIsClientPopoverOpen(true)}
                >
                  {freightQuote.clientName ? (
                    freightQuote.clientName
                  ) : (
                    <span className="text-muted-foreground">Selecionar cliente...</span>
                  )}
                  <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup heading="Clientes">
                      {isLoadingClients ? (
                        <div className="p-2">
                          <Skeleton className="h-5 w-full" />
                          <Skeleton className="h-5 w-full mt-2" />
                          <Skeleton className="h-5 w-full mt-2" />
                        </div>
                      ) : (
                        clients?.map((client: any) => (
                          <CommandItem
                            key={client.id}
                            onSelect={() => handleSelectClient(client.id, client.name)}
                            className="flex items-center"
                          >
                            <span>{client.name}</span>
                            {client.id === freightQuote.clientId && (
                              <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                            )}
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Origin container */}
        <div>
          <Label htmlFor="origin" className="mb-2 font-medium text-neutral-800 dark:text-white">
            Origem (Paraguai)
          </Label>
          {origin ? (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MapPin className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              </div>
              <Input
                id="origin"
                type="text"
                className="pl-10 pr-10"
                value={origin}
                readOnly
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearOrigin}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MapPin className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                </div>
                <Input
                  id="origin-search"
                  type="text"
                  className="pl-10 pr-10"
                  placeholder="Buscar cidade de origem"
                  value={originInput}
                  onChange={(e) => handleOriginInputChange(e.target.value)}
                  onFocus={() => setIsOriginPopoverOpen(true)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {isOriginLoading && (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                </div>
                
                {isOriginPopoverOpen && originInput.length >= 3 && (
                  <div className="absolute z-50 w-full bg-white dark:bg-neutral-800 mt-1 rounded-md shadow-md border border-neutral-200 dark:border-neutral-700 max-h-[200px] overflow-y-auto">
                    {originPlaces && originPlaces.length > 0 ? (
                      <div className="p-0">
                        {originPlaces.map((place) => (
                          <div
                            key={place.place_id}
                            className="flex items-center p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                            onClick={() => selectOriginPlace(place)}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{place.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 text-neutral-500 dark:text-neutral-400">
                        Nenhum resultado encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Botão para selecionar no mapa */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openOriginMapSelector}
                className="w-full text-xs flex items-center justify-center gap-2"
              >
                <MapPin className="h-3.5 w-3.5" />
                Selecionar ponto no mapa
              </Button>
            </div>
          )}
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Especifique o local de origem no Paraguai
          </p>
        </div>
        
        {/* Destination container */}
        <div>
          <Label htmlFor="destination" className="mb-2 font-medium text-neutral-800 dark:text-white">
            Destino (Brasil)
          </Label>
          {destination ? (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MapPinOff className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              </div>
              <Input
                id="destination"
                type="text"
                className="pl-10 pr-10"
                value={destination}
                readOnly
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearDestination}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MapPinOff className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                </div>
                <Input
                  id="destination-search"
                  type="text"
                  className="pl-10 pr-10"
                  placeholder="Buscar cidade de destino"
                  value={destinationInput}
                  onChange={(e) => handleDestinationInputChange(e.target.value)}
                  onFocus={() => setIsDestinationPopoverOpen(true)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {isDestinationLoading && (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                </div>
                
                {isDestinationPopoverOpen && destinationInput.length >= 3 && (
                  <div className="absolute z-50 w-full bg-white dark:bg-neutral-800 mt-1 rounded-md shadow-md border border-neutral-200 dark:border-neutral-700 max-h-[200px] overflow-y-auto">
                    {destinationPlaces && destinationPlaces.length > 0 ? (
                      <div className="p-0">
                        {destinationPlaces.map((place) => (
                          <div
                            key={place.place_id}
                            className="flex items-center p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                            onClick={() => selectDestinationPlace(place)}
                          >
                            <MapPinOff className="h-4 w-4 mr-2" />
                            <span>{place.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 text-neutral-500 dark:text-neutral-400">
                        Nenhum resultado encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Botão para selecionar no mapa */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openDestinationMapSelector}
                className="w-full text-xs flex items-center justify-center gap-2"
              >
                <MapPin className="h-3.5 w-3.5" />
                Selecionar ponto no mapa
              </Button>
            </div>
          )}
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Especifique o local de destino no Brasil
          </p>
        </div>
      </div>

      {/* Recomendação de Aduana e Pagamento ao Motorista - 2 colunas */}
      {origin && destination && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna da esquerda: Recomendação de Aduana */}
            <div>
              <div className="mb-2">
                <h3 className="text-base font-medium">Recomendação de Aduana</h3>
                <p className="text-sm text-muted-foreground">
                  Com base na origem e destino, encontraremos a melhor aduana para sua travessia.
                </p>
              </div>
              
              <div>
                <Button
                  type="button"
                  variant="default"
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold w-full"
                  onClick={() => fetchAduanaRecommendation(originPlaceId, destinationPlaceId)}
                  disabled={isLoadingRecommendation}
                  style={{ color: 'white' }}
                >
                  {isLoadingRecommendation ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      <span>Calculando melhor rota...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="h-4 w-4" />
                      <span>Recomendar Aduana</span>
                    </>
                  )}
                </Button>
              </div>
              
              {recommendedAduana && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-300">Aduana recomendada: {recommendedAduana.name}</h4>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Distância total via {recommendedAduana.name}: {recommendedAduana.details.totalDistance} km
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Coluna da direita: Recomendação de ML para pagamento ao motorista */}
            <div>
              <div className="mb-2">
                <h3 className="text-base font-medium">Pagamento ao Motorista</h3>
                <p className="text-sm text-muted-foreground">
                  Recomendação inteligente baseada em dados históricos e sazonalidade.
                </p>
              </div>
              
              {recommendedAduana ? (
                <MLRecommendationButton 
                  freightData={{
                    tonnage,
                    totalDistance: recommendedAduana.details.totalDistance || 0,
                    driverPayment: driverPayment || 0,
                    profitMargin: profitMargin || 0,
                    originCity: origin.split(',')[0] || '',
                    destinationCity: destination.split(',')[0] || '',
                    // Coordenadas completas
                    originCoordinates,
                    destinationCoordinates,
                    // Adicionando as coordenadas em formato de string também
                    originLat: originCoordinates?.lat?.toString(),
                    originLng: originCoordinates?.lng?.toString(),
                    destinationLat: destinationCoordinates?.lat?.toString(),
                    destinationLng: destinationCoordinates?.lng?.toString(),
                    // Compatibilidade com destLat/destLng
                    destLat: destinationCoordinates?.lat?.toString(),
                    destLng: destinationCoordinates?.lng?.toString(),
                    productType: productType || 'grains',
                    departureDate: departureDate
                  }} 
                  variant="outline"
                  className="border-blue-600 text-blue-700 hover:bg-blue-50 w-full justify-center"
                  onRecommendationReceived={(recommendedPrice) => {
                    // Apenas armazenamos o valor recomendado mas não aplicamos automaticamente
                    // O usuário vai aplicar no botão "Usar valor recomendado"
                    updateFreightQuote({ 
                      mlRecommendedPrice: recommendedPrice
                    });
                    // O valor só será aplicado quando o usuário clicar no botão "Usar valor recomendado"
                    // que agora aparece abaixo do botão de recomendação
                    setDriverPayment(recommendedPrice);
                  }}
                />
              ) : (
                <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-md p-4 text-center text-muted-foreground text-sm">
                  <Brain className="h-5 w-5 mx-auto mb-2 opacity-50" />
                  Primeiro obtenha uma recomendação de aduana para calcular o pagamento ao motorista
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="productType" className="mb-2 font-medium text-neutral-800 dark:text-white">
            Tipo de Produto
          </Label>
          <Select 
            value={productType || 'select_default'} 
            onValueChange={(value) => {
              if (value !== 'select_default') {
                setProductType(value as ProductType);
                setSpecificProduct(''); // Limpa o produto específico ao mudar de categoria
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="select_default" disabled>Selecione o tipo de produto</SelectItem>
              {productOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {productType === 'grains' && (
          <div>
            <Label htmlFor="specificProduct" className="mb-2 font-medium text-neutral-800 dark:text-white">
              Produto Específico
            </Label>
            <Select 
              value={specificProduct || 'default_product'} 
              onValueChange={(value) => {
                if (value !== 'default_product') {
                  // Usar useEffect para manipular efeitos colaterais é mais seguro
                  // Aqui apenas atualizamos o valor do produto selecionado
                  setSpecificProduct(value);
                  
                  // Usamos um try-catch para evitar erros durante a operação
                  try {
                    // Busca o preço do produto selecionado
                    const product = allProducts.find(p => p.name.toLowerCase() === value.toLowerCase());
                    if (product) {
                      // Atualiza o valor da mercadoria com base no preço do produto e tonelagem
                      // Usa uma verificação mais segura para a tonelagem
                      const currentTonnage = typeof tonnage === 'number' && tonnage > 0 ? tonnage : 1000;
                      const newMerchandiseValue = product.price * currentTonnage;
                      
                      // Atualizamos o valor com um pequeno atraso para evitar conflitos de estado
                      setTimeout(() => {
                        setMerchandiseValue(newMerchandiseValue);
                      }, 0);
                    }
                  } catch (error) {
                    console.error("Erro ao atualizar valor da mercadoria:", error);
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default_product" disabled>Selecione o produto</SelectItem>
                {specificProductOptions.grains.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} (${option.price.toFixed(2)}/ton)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Preços de referência internacional - USD/ton
            </p>
          </div>
        )}
      </div>
      
      {/* Placeholder para área reservada após a recomendação */}
      <div className="mt-2 mb-4">
        {/* Área reservada para informações adicionais mais tarde, se necessário */}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="tonnage" className="mb-2 font-medium text-neutral-800 dark:text-white">
            Quantidade (Toneladas)
          </Label>
          <div className="relative">
            <Input
              id="tonnage"
              type="number"
              min="0"
              step="0.1"
              placeholder="1000"
              value={tonnage}
              onChange={(e) => {
                try {
                  const newTonnage = e.target.value ? Number(e.target.value) : '';
                  setTonnage(newTonnage);
                  
                  // Envolvemos em um setTimeout para evitar problemas de manipulação de estado
                  setTimeout(() => {
                    try {
                      // Atualiza o valor da mercadoria com base no preço do produto e nova tonelagem se houver produto selecionado
                      if (specificProduct && typeof newTonnage === 'number' && newTonnage > 0) {
                        const product = allProducts.find(p => p.name.toLowerCase() === specificProduct.toLowerCase());
                        if (product) {
                          setMerchandiseValue(product.price * newTonnage);
                        }
                      }
                      
                      // Não recalculamos mais a aduana automaticamente quando a tonelagem muda
                      // O usuário deve clicar no botão de recomendação manualmente 
                      // Apenas mostramos um toast informativo se a tonelagem for alterada significativamente
                      if (typeof newTonnage === 'number' && newTonnage > 0 &&
                          Math.abs(Number(tonnage) - newTonnage) > 100 && // Se houver alteração significativa  
                          origin && destination && originPlaceId && destinationPlaceId) {
                        toast({
                          title: "Tonelagem atualizada",
                          description: "",
                          variant: "default",
                          duration: 800
                        });
                      }
                    } catch (updateError) {
                      console.error("Erro ao atualizar valores após mudança de tonelagem:", updateError);
                    }
                  }, 0);
                } catch (error) {
                  console.error("Erro ao processar alteração de tonelagem:", error);
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-neutral-500 dark:text-neutral-400 text-sm">ton</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Valor padrão: {appSettings.defaultTonnage} toneladas
          </p>
        </div>
        
        <div>
          <Label htmlFor="driverPayment" className="mb-2 font-medium text-neutral-800 dark:text-white">
            Pagamento do Motorista (BRL/ton)
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-neutral-500 dark:text-neutral-400">R$</span>
            </div>
            <Input
              id="driverPayment"
              type="number"
              min="0"
              step="0.01"
              className="pl-10"
              placeholder="25.00"
              value={driverPayment}
              onChange={(e) => setDriverPayment(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="merchandiseValue" className="mb-2 font-medium text-neutral-800 dark:text-white">
          Valor da Mercadoria (USD)
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="text-neutral-500 dark:text-neutral-400">$</span>
          </div>
          <Input
            id="merchandiseValue"
            type="number"
            min="0"
            step="0.01"
            className="pl-10"
            placeholder="50000.00"
            value={merchandiseValue}
            onChange={(e) => setMerchandiseValue(e.target.value ? Number(e.target.value) : '')}
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Usado para cálculo de seguro e tributos
        </p>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleContinue}
          disabled={!isFormValid()}
          className="px-5 py-2.5"
        >
          Continuar
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Seletores de pontos no mapa */}
      <MapPointSelector
        open={isOriginMapSelectorOpen}
        onClose={() => setIsOriginMapSelectorOpen(false)}
        onSelectLocation={handleOriginMapSelection}
        pointType="origin"
        initialPosition={originCoordinates}
      />
      
      <MapPointSelector
        open={isDestinationMapSelectorOpen}
        onClose={() => setIsDestinationMapSelectorOpen(false)}
        onSelectLocation={handleDestinationMapSelection}
        pointType="destination"
        initialPosition={destinationCoordinates}
      />
    </div>
  );
};

export default BasicInfoForm;
