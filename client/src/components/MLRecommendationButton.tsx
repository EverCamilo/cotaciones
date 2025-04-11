import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import MLFeedbackDialog from './MLFeedbackDialog'

export interface MLRecommendationProps {
  freightData: {
    totalDistance?: number
    month?: number
    originCity?: string
    destinationCity?: string
    originLat?: string | number
    originLng?: string | number
    destinationLat?: string | number
    destinationLng?: string | number
    destLat?: string | number
    destLng?: string | number
    originCoordinates?: { lat: number, lng: number } | null
    destinationCoordinates?: { lat: number, lng: number } | null
    tonnage?: number | string
    productType?: string
    [key: string]: any
  }
  onRecommendationReceived: (value: number) => void
  className?: string
  variant?: string
}

const MLRecommendationButton = ({
  freightData,
  onRecommendationReceived,
  className = ""
}: MLRecommendationProps) => {
  const [loading, setLoading] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [recommendedValue, setRecommendedValue] = useState<number>(0)
  const [recommendationData, setRecommendationData] = useState<any>(null)
  const { toast } = useToast()

  const getRecommendation = async () => {
    // Verificar se temos a distância total
    if (!freightData.totalDistance) {
      toast({
        title: 'Distância não informada',
        description: 'É necessário informar a distância total para obter uma recomendação.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      // Preparar os dados para enviar ao backend
      const data = {
        ...freightData,
        // Garantir que temos o mês para sazonalidade
        month: freightData.month || new Date().getMonth() + 1,
      }

      // Logs removidos para a versão de produção

      const response = await fetch('/api/ml/recommend-freight-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const resultData = await response.json();
      
      if (resultData.success) {
        const price = resultData.recommendedPrice;
        
        // Salvar o valor recomendado e os dados completos da recomendação
        setRecommendedValue(price);
        setRecommendationData(resultData);
        
        // NÃO notificamos o componente pai automaticamente
        // onRecommendationReceived(price) será chamado apenas quando o usuário clicar em "Usar valor recomendado"
        
        // Construir uma descrição explicativa sobre a recomendação
        let explanation = `Valor recomendado: ${formatCurrency(price)}`;
        
        // Adicionar mais detalhes sobre o método usado
        if (resultData.method) {
          let methodDescription = '';
          switch (resultData.method) {
            case 'exact_historical_match':
              methodDescription = 'Correspondência exata com rotas históricas';
              break;
            case 'high_similarity':
              methodDescription = 'Alta similaridade com rotas históricas';
              break;
            case 'moderate_similarity':
              methodDescription = 'Similaridade moderada com rotas históricas';
              break;
            case 'low_similarity':
              methodDescription = 'Baixa similaridade com rotas históricas';
              break;
            case 'ml_model':
              methodDescription = 'Predição por modelo avançado de aprendizado de máquina';
              break;
            case 'distance_heuristic':
              methodDescription = 'Estimativa baseada em distância e preço por quilômetro';
              break;
            default:
              methodDescription = resultData.method;
          }
          explanation += `\nMétodo: ${methodDescription}`;
        }
        
        // Adicionar confiança se disponível
        if (resultData.confidence !== undefined) {
          const confidencePercent = Math.round(resultData.confidence * 100);
          explanation += `\nConfiança: ${confidencePercent}%`;
        }
        
        // Adicionar descrição detalhada se disponível
        if (resultData.similarityDescription) {
          explanation += `\nDetalhes: ${resultData.similarityDescription}`;
        }
        
        // Adicionar dados de contexto histórico
        if (resultData.historicalContext) {
          const context = resultData.historicalContext;
          explanation += `\n\nBaseado em ${context.count} rotas similares`;
          explanation += `\nMédia histórica: ${formatCurrency(context.average)}`;
        }
        
        // Mostrar diálogo de feedback com os detalhes da recomendação
        // O botão de ver detalhes e a notificação toast foram removidos
        // pois tudo está agora no diálogo de feedback
        setShowFeedbackDialog(true);
      } else {
        toast({
          title: 'Erro ao obter recomendação',
          description: resultData.error || 'Não foi possível obter uma recomendação de valor.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro na comunicação',
        description: 'Não foi possível se comunicar com o serviço de recomendação. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-col space-y-2">
        <Button 
          onClick={getRecommendation}
          disabled={loading || !freightData.totalDistance}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold ${className}`}
          variant="default"
          style={{ color: 'white' }}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Consultando...
            </>
          ) : (
            'Recomendar valor (IA)'
          )}
        </Button>
        
        {/* O botão "Usar valor recomendado" agora está dentro do diálogo de feedback */}
      </div>
      
      {/* Diálogo de feedback que aparece após receber a recomendação */}
      <MLFeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        recommendedPrice={recommendedValue}
        routeMetadata={{
          distance: Number(freightData.totalDistance) || 0,
          originCity: freightData.originCity || '',
          destinationCity: freightData.destinationCity || '',
          tonnage: Number(freightData.tonnage) || 1000,
          productType: freightData.productType || 'grains'
        }}
        onUseRecommendedValue={() => {
          onRecommendationReceived(recommendedValue);
          toast({
            title: 'Valor aplicado',
            description: `O valor de R$ ${recommendedValue.toFixed(2)}/ton foi aplicado ao pagamento do motorista.`,
            variant: 'default',
          });
        }}
        recommendationDetails={recommendationData ? {
          confidence: recommendationData.confidence || 0.5,
          method: recommendationData.method || 'unknown',
          similarityDescription: recommendationData.similarityDescription,
          historicalContext: recommendationData.historicalContext
        } : undefined}
      />
      
      {/* 
        Componente de detalhes da recomendação ML não é mais necessário, 
        pois os detalhes agora estão dentro do diálogo de feedback 
      */}
    </>
  )
}

export default MLRecommendationButton