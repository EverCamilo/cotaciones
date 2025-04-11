import { useFreight } from "../../contexts/FreightContext";
import { Button } from "../ui/button";
import { ChevronLeft, FileDown, RefreshCw } from "lucide-react";
import SummaryCard from "../results/SummaryCard";
import RouteMap from "../results/RouteMap";
import CostBreakdown from "../results/CostBreakdown";
import AduanaComparison from "../results/AduanaComparison";
import { PDFDownloadButton } from "../pdf/QuotePDF";
import { useToast } from "../../hooks/use-toast";
import { useEffect, useState } from "react";
import MLRecommendationButton from "../MLRecommendationButton";

const ResultsView = () => {
  const { freightQuote, setCurrentStep, resetFreightQuote, saveQuote, isSaving, updateFreightQuote } = useFreight();
  const { toast } = useToast();
  const [pdfReady, setPdfReady] = useState(false);

  useEffect(() => {
    // Simulate delay for PDF preparation
    const timer = setTimeout(() => {
      setPdfReady(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleRestart = () => {
    resetFreightQuote();
    setCurrentStep(1);
  };

  const handleBack = () => {
    setCurrentStep(2);
  };

  const handleSave = async () => {
    try {
      await saveQuote();
      toast({
        title: "Cotação salva com sucesso",
        description: "Você pode acessá-la no histórico",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar cotação",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };
  
  // Handler para receber recomendação de preço do ML
  const handleMLRecommendation = (recommendedPrice: number) => {
    // Atualizar o contexto com o preço recomendado
    const currentCostPerTon = freightQuote.costPerTon || 0;
    const currentTonnage = freightQuote.tonnage || 0;
    
    // Calcular novo custo total baseado no preço recomendado
    const newTotalCost = recommendedPrice * currentTonnage;
    
    // Atualizar a cotação com o novo preço
    updateFreightQuote({
      costPerTon: recommendedPrice,
      totalCost: newTotalCost,
      usingMLRecommendation: true,
      mlRecommendedPrice: recommendedPrice
    });
    
    // Notificar o usuário
    toast({
      title: "Preço recomendado aplicado",
      description: `O preço por tonelada foi atualizado de U$ ${currentCostPerTon.toFixed(2)} para U$ ${recommendedPrice.toFixed(2)} com base na análise de dados históricos.`,
      duration: 5000,
    });
  };

  // PDF preparation is now handled by the PDFDownloadButton component

  if (!freightQuote.recommendedAduana || !freightQuote.totalCost) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-xl font-bold text-neutral-800 dark:text-white mb-2">
            Sem resultados disponíveis
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            Por favor, complete os passos anteriores para visualizar os resultados.
          </p>
          <Button onClick={() => setCurrentStep(1)}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  // DIAGNÓSTICO: Explorar os dados de FAF para descobrir onde está o problema
  const fafItems = freightQuote.costBreakdown?.filter(item => 
    item.item === 'FAF'
  ) || [];
  
  // Para todas as aduanas, incluindo as comparações
  const fafDetailsFromAllAduanas = freightQuote.aduanaComparison?.map(aduana => {
    // Como costs não é parte da interface AduanaDetails, tratamos de maneira mais segura
    // utilizando uma conversão de tipo para acessar a propriedade de forma dinâmica
    const aduanaAny = aduana as any;
    const adaunaCosts = aduanaAny.costs || [];
    const fafItem = adaunaCosts.find((item: any) => item?.item === 'FAF');
    
    return {
      aduana: aduana.name,
      fafDetails: fafItem?.details,
      fafValue: fafItem?.value
    };
  }) || [];
  
  // Adicionar dados de diagnóstico ao console para depuração
  console.log('[DIAGNÓSTICO FAF] Detalhes do FAF para todas as aduanas:', fafDetailsFromAllAduanas);
  
  return (
    <div className="space-y-8">

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Summary cards */}
        <div className="space-y-6">
          <SummaryCard 
            recommendedAduana={freightQuote.recommendedAduana}
            totalCost={freightQuote.totalCost}
            costPerTon={freightQuote.costPerTon}
            totalDistance={freightQuote.totalDistance}
            requiredTrucks={freightQuote.requiredTrucks}
            exchangeRate={freightQuote.exchangeRate}
            estimatedProfit={freightQuote.estimatedProfit}
            productType={freightQuote.productType}
            specificProduct={freightQuote.specificProduct}
            productPrice={freightQuote.productPrice}
            tonnage={freightQuote.tonnage}
          />
          
          {/* Botão de recomendação de preço por ML */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
            <h4 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-400">
              Inteligência Artificial
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Utilize nossa IA para recomendar um preço competitivo com base em dados históricos de fretes similares.
            </p>
            <MLRecommendationButton 
              freightData={{
                ...freightQuote,
                // Garantir que coordenadas sejam incluídas mesmo se não estiverem no freightQuote
                originLat: freightQuote.originLat || (freightQuote.originCoordinates?.lat?.toString()),
                originLng: freightQuote.originLng || (freightQuote.originCoordinates?.lng?.toString()),
                destinationLat: freightQuote.destinationLat || (freightQuote.destinationCoordinates?.lat?.toString()),
                destinationLng: freightQuote.destinationLng || (freightQuote.destinationCoordinates?.lng?.toString()),
                destLat: freightQuote.destLat || freightQuote.destinationLat || (freightQuote.destinationCoordinates?.lat?.toString()),
                destLng: freightQuote.destLng || freightQuote.destinationLng || (freightQuote.destinationCoordinates?.lng?.toString()),
              }} 
              onRecommendationReceived={handleMLRecommendation}
              className="w-full"
            />
            {freightQuote.mlRecommendedPrice && (
              <div className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium">Última recomendação:</span> U$ {freightQuote.mlRecommendedPrice.toFixed(2)} por tonelada
              </div>
            )}
          </div>
        </div>
        
        {/* Middle and right columns - Map and details */}
        <div className="lg:col-span-2 space-y-6">
          <RouteMap 
            origin={freightQuote.origin}
            destination={freightQuote.destination}
            customsPoint={freightQuote.recommendedAduana}
            totalDistance={freightQuote.totalDistance}
            customsDetails={freightQuote.customsDetails}
            distanceSegments={{
              originToCustoms: freightQuote.routeSegments?.originToCustoms,
              customsToDestination: freightQuote.routeSegments?.customsToDestination,
              crossingDistance: freightQuote.routeSegments?.crossingDistance || 5
            }}
            originPlaceId={freightQuote.originPlaceId}
            destinationPlaceId={freightQuote.destinationPlaceId}
          />
          
          <CostBreakdown costItems={freightQuote.costBreakdown} />
          
          <AduanaComparison aduanas={freightQuote.aduanaComparison} />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRestart}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Nova Cotação
          </Button>
          
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Cotação"}
          </Button>
          
          {pdfReady ? (
            <PDFDownloadButton 
              data={freightQuote} 
              fileName={`cotacao-${freightQuote.recommendedAduana?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`}
              buttonText="Exportar PDF"
              buttonClassName="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            />
          ) : (
            <Button>
              <FileDown className="mr-1 h-4 w-4" />
              <span>Preparando PDF...</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
