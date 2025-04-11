import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, ArrowRight, BarChart, Check, ChevronDown, ChevronUp, HelpCircle, Info, MapIcon, MapPin, ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

interface MLFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recommendedPrice: number
  routeMetadata: {
    distance: number
    originCity: string
    destinationCity: string
    tonnage: number
    productType: string
  }
  onUseRecommendedValue?: () => void
  recommendationDetails?: {
    confidence: number;
    method: string;
    similarityDescription?: string;
    historicalContext?: {
      count: number;
      average: number;
      examples: Array<{
        distance: number;
        price: number;
        score: number;
        date?: string;
        coordinates?: {
          origin: { lat: number; lng: number };
          destination: { lat: number; lng: number };
        };
      }>;
    };
  }
}

const MLFeedbackDialog = ({
  open,
  onOpenChange,
  recommendedPrice,
  routeMetadata,
  onUseRecommendedValue,
  recommendationDetails
}: MLFeedbackDialogProps) => {
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null)
  const [suggestedPrice, setSuggestedPrice] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedDetails, setExpandedDetails] = useState(false)
  const { toast } = useToast()

  const sendFeedback = async () => {
    if (isHelpful === null) {
      toast({
        title: 'Feedback incompleto',
        description: 'Por favor, informe se a recomendação foi útil.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const feedbackData = {
        originalRecommendation: recommendedPrice,
        userSuggestedPrice: suggestedPrice ? parseFloat(suggestedPrice) : null,
        isHelpful,
        metadata: {
          ...routeMetadata,
        }
      }

      const response = await fetch('/api/ml/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      })

      if (!response.ok) {
        throw new Error('Falha ao enviar feedback')
      }

      toast({
        title: 'Obrigado pelo feedback!',
        description: 'Seu feedback ajudará a melhorar as recomendações futuras.',
      })

      // Fechar o diálogo após feedback bem-sucedido
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao enviar feedback:', error)
      toast({
        title: 'Erro ao enviar feedback',
        description: 'Não foi possível enviar seu feedback. Tente novamente mais tarde.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Informações sobre o método de recomendação
  let methodTitle = 'Recomendação de IA';
  let methodDescription = 'Análise inteligente baseada em rotas similares';
  let methodIcon = <TrendingUp className="h-5 w-5 text-blue-500" />;

  if (recommendationDetails) {
    switch (recommendationDetails.method) {
      case 'exact_historical_match':
        methodTitle = 'Correspondência Exata';
        methodDescription = 'Encontrada uma rota idêntica no histórico';
        methodIcon = <Check className="h-5 w-5 text-green-500" />;
        break;
      case 'high_similarity':
        methodTitle = 'Alta Similaridade';
        methodDescription = 'Encontradas rotas muito similares no histórico';
        methodIcon = <Check className="h-5 w-5 text-green-400" />;
        break;
      case 'moderate_similarity':
        methodTitle = 'Similaridade Moderada';
        methodDescription = 'Encontradas rotas com características semelhantes';
        methodIcon = <Info className="h-5 w-5 text-blue-500" />;
        break;
      case 'low_similarity':
        methodTitle = 'Baixa Similaridade';
        methodDescription = 'Poucas rotas similares encontradas';
        methodIcon = <AlertCircle className="h-5 w-5 text-yellow-500" />;
        break;
      case 'ml_model':
        methodTitle = 'Modelo de Aprendizado de Máquina';
        methodDescription = 'Predição baseada em padrões complexos identificados nos dados históricos';
        methodIcon = <TrendingUp className="h-5 w-5 text-purple-500" />;
        break;
      case 'distance_heuristic':
        methodTitle = 'Estimativa por Distância';
        methodDescription = 'Cálculo baseado no preço médio por quilômetro para rotas similares';
        methodIcon = <ArrowRight className="h-5 w-5 text-orange-500" />;
        break;
      case 'geographic_coordinates':
        methodTitle = 'Coordenadas Geográficas';
        methodDescription = 'Recomendação baseada em rotas com localização muito similar';
        methodIcon = <MapPin className="h-5 w-5 text-green-500" />;
        break;
      case 'combined_geo_priority':
        methodTitle = 'Análise Geográfica Avançada';
        methodDescription = 'Combinação de localização geográfica e padrões de preços históricos';
        methodIcon = <MapIcon className="h-5 w-5 text-blue-600" />;
        break;
      case 'combined_balanced':
        methodTitle = 'Análise Equilibrada';
        methodDescription = 'Combinação balanceada entre localização geográfica e modelo preditivo';
        methodIcon = <BarChart className="h-5 w-5 text-indigo-500" />;
        break;
      // Caso qualquer outro método seja enviado, usamos o título e descrição padrão definidos acima
    }
  }

  // Confiança da recomendação
  // A confiança já vem como número decimal entre 0 e 1, precisamos converter para porcentagem
  // Mas verificamos primeiro se já não é uma porcentagem (maior que 1)
  const confidencePercent = recommendationDetails 
    ? (recommendationDetails.confidence > 1 
        ? Math.round(recommendationDetails.confidence) // Já é porcentagem
        : Math.round(recommendationDetails.confidence * 100)) // Converter para porcentagem
    : 0;
  
  // Cor do indicador de confiança
  let confidenceColor = 'bg-red-500';
  if (confidencePercent >= 90) {
    confidenceColor = 'bg-green-500';
  } else if (confidencePercent >= 75) {
    confidenceColor = 'bg-green-400';
  } else if (confidencePercent >= 60) {
    confidenceColor = 'bg-yellow-400';
  } else if (confidencePercent >= 40) {
    confidenceColor = 'bg-yellow-500';
  } else if (confidencePercent >= 20) {
    confidenceColor = 'bg-orange-500';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entenda como chegamos ao valor recomendado para esta rota</DialogTitle>
          <DialogDescription>
            Veja detalhes da recomendação e forneça seu feedback para ajudar a melhorar o sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Seção do Valor Recomendado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div className="flex flex-col">
              <div className="text-sm text-gray-500">Valor Recomendado</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(recommendedPrice)}</div>
            </div>
            {recommendationDetails && (
              <div className="flex flex-col">
                <div className="text-sm text-gray-500">Confiança na Recomendação</div>
                <div className="flex items-center gap-2">
                  <Progress value={confidencePercent} className={`h-2 flex-1 ${confidenceColor}`} />
                  <span className="text-lg sm:text-xl font-semibold whitespace-nowrap">{confidencePercent}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Usar valor recomendado - Botão */}
          {onUseRecommendedValue && (
            <Button 
              onClick={() => {
                onUseRecommendedValue();
                toast({
                  title: 'Valor aplicado',
                  description: `O valor de ${formatCurrency(recommendedPrice)} foi aplicado ao pagamento do motorista.`,
                });
                onOpenChange(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
              variant="default"
              style={{ color: 'white' }}
            >
              Usar valor recomendado ({formatCurrency(recommendedPrice)})
            </Button>
          )}

          <Separator />

          {/* Detalhes da recomendação */}
          {recommendationDetails && (
            <>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  {methodIcon}
                  <span className="font-medium">{methodTitle}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {methodDescription}
                </div>
              </div>

              {recommendationDetails.similarityDescription && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Detalhes adicionais:</span> {recommendationDetails.similarityDescription}
                </div>
              )}

              {/* Contexto histórico */}
              {recommendationDetails.historicalContext && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Contexto de rotas semelhantes</div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setExpandedDetails(!expandedDetails)}
                      className="p-1 h-auto"
                    >
                      {expandedDetails ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                  <div className="text-sm">
                    Baseado em <span className="font-semibold">{recommendationDetails.historicalContext.count}</span> rotas similares
                    {recommendationDetails.historicalContext.average && (
                      <> com média histórica de <span className="font-semibold">{formatCurrency(recommendationDetails.historicalContext.average)}</span></>
                    )}
                  </div>

                  {/* Exemplos de rotas similares */}
                  {expandedDetails && recommendationDetails.historicalContext.examples && (
                    <div className="mt-2 space-y-2">
                      <div className="text-sm font-medium">Exemplos:</div>
                      
                      {recommendationDetails.historicalContext.examples.map((example, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md text-sm">
                          <div className="flex justify-between">
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {example.distance}km
                              </Badge>
                              <span className="ml-2 font-medium">{formatCurrency(example.price)}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {example.date && (
                                <span>{new Date(example.date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          {example.coordinates && (
                            <div className="text-xs text-gray-500 flex items-start mt-1">
                              <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                              <span className="break-all">
                                ({example.coordinates.origin.lat.toFixed(4)}, {example.coordinates.origin.lng.toFixed(4)}) → 
                                ({example.coordinates.destination.lat.toFixed(4)}, {example.coordinates.destination.lng.toFixed(4)})
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <Separator />

          {/* Feedback da recomendação */}
          <div className="text-sm font-medium mb-0">Feedback da Recomendação</div>

          <RadioGroup
            value={isHelpful === null ? undefined : isHelpful ? 'sim' : 'nao'}
            onValueChange={(value) => setIsHelpful(value === 'sim')}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sim" id="r1" />
              <Label htmlFor="r1" className="flex items-center">
                <ThumbsUp className="mr-2 h-4 w-4" /> Sim, essa recomendação foi útil
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nao" id="r2" />
              <Label htmlFor="r2" className="flex items-center">
                <ThumbsDown className="mr-2 h-4 w-4" /> Não, essa recomendação precisa melhorar
              </Label>
            </div>
          </RadioGroup>

          {isHelpful === false && (
            <div className="space-y-2">
              <Label htmlFor="suggestedPrice">
                Qual seria um valor mais adequado para esta rota?
              </Label>
              <Input
                id="suggestedPrice"
                placeholder="Valor sugerido por tonelada"
                type="number"
                value={suggestedPrice}
                onChange={(e) => setSuggestedPrice(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting}
            className="sm:order-1 w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={sendFeedback} 
            disabled={isSubmitting}
            className="sm:order-2 w-full sm:w-auto"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                Enviando...
              </span>
            ) : (
              <span className="flex items-center">
                <Check className="mr-2 h-4 w-4" /> Enviar feedback
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MLFeedbackDialog