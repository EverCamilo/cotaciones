import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ArrowRight, CheckCircle, ChevronDown, ChevronUp, HelpCircle, Info, MapPin, TrendingUp, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface MLRecommendationDetailsProps {
  recommendation: {
    recommendedPrice: number;
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
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MLRecommendationDetails = ({
  recommendation,
  isOpen,
  onOpenChange
}: MLRecommendationDetailsProps) => {
  const [expandedDetails, setExpandedDetails] = useState(false);

  // Se não houver recomendação ou não estiver aberto, não renderizar
  if (!recommendation || !isOpen) {
    return null;
  }

  const { 
    recommendedPrice, 
    confidence, 
    method, 
    similarityDescription, 
    historicalContext 
  } = recommendation;

  // Converter confiança para porcentagem
  const confidencePercent = Math.round(confidence * 100);

  // Determinar o método amigável
  let methodTitle = 'Método desconhecido';
  let methodDescription = '';
  let methodIcon = <HelpCircle className="h-5 w-5 text-gray-500" />;

  switch (method) {
    case 'exact_historical_match':
      methodTitle = 'Correspondência Exata';
      methodDescription = 'Encontrada uma rota idêntica no histórico';
      methodIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
      break;
    case 'high_similarity':
      methodTitle = 'Alta Similaridade';
      methodDescription = 'Encontradas rotas muito similares no histórico';
      methodIcon = <CheckCircle className="h-5 w-5 text-green-400" />;
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
  }

  // Determinar a cor do indicador de confiança
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
    <Card className="w-full mt-4 shadow-lg">
      <CardHeader className="bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Detalhes da Recomendação</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Entenda como chegamos ao valor recomendado para esta rota
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <div className="text-sm text-gray-500">Valor Recomendado</div>
            <div className="text-3xl font-bold text-primary">{formatCurrency(recommendedPrice)}</div>
          </div>
          <div className="flex flex-col">
            <div className="text-sm text-gray-500">Confiança na Recomendação</div>
            <div className="flex items-center gap-2">
              <Progress value={confidencePercent} className={`h-2 ${confidenceColor}`} />
              <span className="text-xl font-semibold">{confidencePercent}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md mb-4">
          <div className="flex items-center gap-2 mb-1">
            {methodIcon}
            <span className="font-medium">{methodTitle}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {methodDescription}
          </div>
        </div>

        {similarityDescription && (
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            <span className="font-medium">Detalhes adicionais:</span> {similarityDescription}
          </div>
        )}

        {historicalContext && (
          <>
            <Separator className="my-3" />
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
            <div className="text-sm mb-2">
              Baseado em <span className="font-semibold">{historicalContext.count}</span> rotas similares
              {historicalContext.average && (
                <> com média histórica de <span className="font-semibold">{formatCurrency(historicalContext.average)}</span></>
              )}
            </div>

            {/* Exemplos detalhados de rotas similares */}
            {expandedDetails && historicalContext.examples && historicalContext.examples.length > 0 && (
              <div className="mt-3 space-y-3">
                <div className="text-sm font-medium">Exemplos de rotas similares:</div>
                
                {historicalContext.examples.map((example, index) => (
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
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>({example.coordinates.origin.lat.toFixed(4)}, {example.coordinates.origin.lng.toFixed(4)}) → 
                        ({example.coordinates.destination.lat.toFixed(4)}, {example.coordinates.destination.lng.toFixed(4)})</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 dark:bg-gray-800 px-4 py-3 text-xs text-gray-500">
        Recomendação gerada por modelo treinado com mais de 3.000 cotações reais.
      </CardFooter>
    </Card>
  );
};

export default MLRecommendationDetails;