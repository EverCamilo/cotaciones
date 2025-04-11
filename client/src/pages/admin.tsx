import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { apiRequest } from '../lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { 
  Settings, 
  Database, 
  RefreshCcw, 
  Brain,
  BarChart2,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Users,
  InfoIcon,
  TrendingUp,
  FileText,
  Zap,
  Map,
  CalendarDays,
  Ruler,
  Award,
  ShieldAlert,
  Shield,
  XCircle,
  Activity,
  Lightbulb,
  Eye,
  PieChart
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Interface para métricas do modelo
interface ModelMetrics {
  r2?: number;
  rmse?: number;
  mae?: number;
  pct_diff?: number;
  feature_importance?: Record<string, number>;
}

// Interface para o estado do modelo
interface ModelState {
  samplesCount: number;
  newSamplesCount: number;
  lastTrainingDate: string | null;
  feedbackCount: number;
  retrainingThreshold: number;
  metrics?: ModelMetrics;
  model_type?: string;
  trained?: boolean;
  featureImportance?: Record<string, number>;
  historicalDataCount?: number;
  activeVersions?: string[];
}

// Componente para exibir uma métrica com descrição e tooltip
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  tooltip,
  status = 'default', // 'success', 'warning', 'error', 'default'
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  description?: string;
  tooltip?: string;
  status?: 'success' | 'warning' | 'error' | 'default';
}) => {
  const statusColors = {
    success: 'bg-green-100 border-green-200 text-green-800',
    warning: 'bg-yellow-100 border-yellow-200 text-yellow-800',
    error: 'bg-red-100 border-red-200 text-red-800',
    default: 'bg-primary/5 border-primary/10 text-foreground'
  };

  const iconColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    default: 'text-primary'
  };

  return (
    <Card className={`${statusColors[status]} border`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${iconColors[status]} p-2 rounded-full bg-white/80 shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs mt-1 opacity-80">{description}</p>}
      </CardContent>
    </Card>
  );
};

// Componente para o Feature Importance com visualização aprimorada
const FeatureImportance = ({ featureImportance }: { featureImportance: Record<string, number> }) => {
  // Mapeamento de nomes técnicos para labels amigáveis
  const featureLabels: Record<string, { label: string, icon: React.ElementType, description: string }> = {
    'distance': { 
      label: 'Distância', 
      icon: Ruler,
      description: 'Distância total da rota em quilômetros'
    },
    'month': { 
      label: 'Mês (Sazonalidade)', 
      icon: CalendarDays,
      description: 'Influência do mês do ano na previsão (sazonalidade)'
    },
    'origin_lat': { 
      label: 'Latitude de Origem', 
      icon: Map,
      description: 'Coordenada geográfica de origem - latitude'
    },
    'origin_lng': { 
      label: 'Longitude de Origem', 
      icon: Map,
      description: 'Coordenada geográfica de origem - longitude'
    },
    'destination_lat': { 
      label: 'Latitude de Destino', 
      icon: Map,
      description: 'Coordenada geográfica de destino - latitude'
    },
    'destination_lng': { 
      label: 'Longitude de Destino', 
      icon: Map,
      description: 'Coordenada geográfica de destino - longitude'
    },
    'quarter': { 
      label: 'Trimestre', 
      icon: CalendarDays,
      description: 'Trimestre do ano (agrupamento sazonal)'
    },
    'value_per_km': { 
      label: 'Valor por Km', 
      icon: TrendingUp,
      description: 'Valor médio histórico por quilômetro'
    },
    'tonnage': { 
      label: 'Tonelagem', 
      icon: Activity,
      description: 'Peso da carga em toneladas'
    }
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-md border">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Influência de Fatores nas Recomendações
        </h3>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(featureImportance)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([feature, importance]) => {
            const percent = (importance as number) * 100;
            const featureInfo = featureLabels[feature] || { 
              label: feature, 
              icon: InfoIcon,
              description: 'Fator usado no cálculo de recomendação'
            };
            const Icon = featureInfo.icon;
            
            return (
              <div key={feature} className="bg-muted/30 p-3 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-md">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{featureInfo.label}</span>
                  </div>
                  <Badge variant={percent > 30 ? "default" : "outline"}>
                    {percent.toFixed(1)}%
                  </Badge>
                </div>
                <div className="mb-1">
                  <Progress value={percent} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{featureInfo.description}</p>
              </div>
            );
          })}
      </div>
    </div>
  );
};

// Componente para exibir detalhes do modelo
const ModelDetails = ({ modelState }: { modelState: ModelState }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle>Detalhes do Modelo</CardTitle>
        </div>
        <CardDescription>
          Informações detalhadas sobre o modelo atual
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span>Status</span>
              </div>
              <div>
                {modelState.trained ? (
                  <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ativo
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Não treinado
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span>Algoritmo</span>
              </div>
              <div>
                {modelState.model_type ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" /> {modelState.model_type}
                  </Badge>
                ) : (
                  <Badge variant="outline">Nenhum</Badge>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                <span>Último Treinamento</span>
              </div>
              <div>
                {modelState.lastTrainingDate ? (
                  <span className="text-sm">
                    {new Date(modelState.lastTrainingDate).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Nunca</span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Sensibilidade</span>
              </div>
              <div>
                {modelState.retrainingThreshold === 1 ? (
                  <Badge className="bg-blue-600">Aprendizado Contínuo</Badge>
                ) : modelState.retrainingThreshold <= 3 ? (
                  <Badge className="bg-green-600">Alta</Badge>
                ) : modelState.retrainingThreshold <= 10 ? (
                  <Badge variant="secondary">Média</Badge>
                ) : (
                  <Badge variant="outline">Baixa</Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Alerta com informações sobre treinamento */}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <InfoIcon className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Sobre o Treinamento do Modelo</AlertTitle>
            <AlertDescription className="text-blue-700 text-sm">
              Este modelo aprende continuamente com cada nova cotação e feedback. O retreinamento acontece 
              automaticamente a cada {modelState.retrainingThreshold} novas entradas para manter as 
              recomendações sempre precisas.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de Estatísticas de Performance
const PerformanceMetrics = ({ metrics }: { metrics?: ModelMetrics }) => {
  if (!metrics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Métricas de Performance</CardTitle>
          </div>
          <CardDescription>
            Não há métricas disponíveis. Treine o modelo primeiro.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Modelo Não Treinado</h3>
            <p className="text-sm text-muted-foreground">
              Treine o modelo para visualizar estatísticas de desempenho.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Métricas de Performance</CardTitle>
        </div>
        <CardDescription>
          Estatísticas sobre a precisão do modelo atual
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <MetricCard
            title="Precisão do Modelo (R²)"
            value={metrics.r2 !== undefined ? `${(metrics.r2 * 100).toFixed(2)}%` : "N/A"}
            icon={TrendingUp}
            tooltip="O coeficiente R² indica quanto da variação dos preços o modelo consegue explicar"
            description="Quanto mais próximo de 100%, melhor a precisão"
            status={metrics.r2 !== undefined ? 
              (metrics.r2 > 0.9 ? 'success' : 
               metrics.r2 > 0.7 ? 'warning' : 'error') : 'default'}
          />
          
          <MetricCard
            title="Erro Médio"
            value={metrics.mae !== undefined ? `R$ ${metrics.mae.toFixed(2)}` : "N/A"}
            icon={AlertTriangle}
            tooltip="Erro médio absoluto - diferença média entre previsão e valor real"
            description="Valor em reais da diferença média entre previsões e valores reais"
            status={metrics.mae !== undefined ? 
              (metrics.mae < 5 ? 'success' : 
               metrics.mae < 15 ? 'warning' : 'error') : 'default'}
          />
          
          <MetricCard
            title="Diferença Percentual"
            value={metrics.pct_diff !== undefined ? `${metrics.pct_diff.toFixed(2)}%` : "N/A"}
            icon={FileText}
            tooltip="Diferença percentual média entre previsão e valor real"
            description="Quanto menor, mais precisa é a recomendação"
            status={metrics.pct_diff !== undefined ? 
              (metrics.pct_diff < 5 ? 'success' : 
               metrics.pct_diff < 10 ? 'warning' : 'error') : 'default'}
          />
          
          <MetricCard
            title="Erro Quadrático (RMSE)"
            value={metrics.rmse !== undefined ? `${metrics.rmse.toFixed(2)}` : "N/A"}
            icon={ShieldAlert}
            tooltip="Raiz do erro quadrático médio - penaliza erros maiores"
            description="Métrica técnica que indica a consistência do modelo"
            status={metrics.rmse !== undefined ? 
              (metrics.rmse < 10 ? 'success' : 
               metrics.rmse < 20 ? 'warning' : 'error') : 'default'}
          />
        </div>
        
        {metrics.r2 !== undefined && metrics.r2 > 0.98 && (
          <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Performance Excepcional</AlertTitle>
            <AlertDescription className="text-green-700 text-sm">
              O modelo atual tem uma precisão excepcional de {(metrics.r2 * 100).toFixed(2)}%, 
              com erro médio de apenas R$ {metrics.mae?.toFixed(2)}. 
              As recomendações são extremamente confiáveis.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// Componente da Página de Administração
const AdminPage = () => {
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  const [modelState, setModelState] = useState<ModelState | null>(null);
  
  // Efeito para carregar o estado do modelo ao iniciar
  useEffect(() => {
    fetchModelState();
  }, []);
  
  // Função para buscar o estado do modelo
  const fetchModelState = async () => {
    try {
      const response = await apiRequest('GET', '/api/ml/state');
      
      if (!response.ok) {
        throw new Error('Falha ao obter estatísticas do modelo');
      }
      
      const data = await response.json();
      
      if (data.success && data.modelState) {
        setModelState(data.modelState);
        console.log('Estatísticas do modelo ML:', data.modelState);
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas do modelo ML:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as estatísticas do modelo ML.',
        variant: 'destructive',
      });
    }
  };
  
  // Função para forçar o retreinamento do modelo
  const handleForceTraining = async () => {
    setIsTrainingLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/ml/train-model');
      
      if (!response.ok) {
        throw new Error('Falha ao treinar o modelo');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: 'Modelo retreinado com sucesso!',
          variant: 'default',
        });
        
        // Atualizar estatísticas
        fetchModelState();
      } else {
        throw new Error(result.message || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro ao treinar modelo:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível treinar o modelo ML. ' + (err instanceof Error ? err.message : ''),
        variant: 'destructive',
      });
    } finally {
      setIsTrainingLoading(false);
    }
  };
  
  return (
    <div className="container max-w-5xl py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-7 w-7" />
          Administração do Sistema
        </h1>
      </div>
      
      <Tabs defaultValue="ml" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ml" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Inteligência Artificial
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Banco de Dados
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ml" className="space-y-6 mt-4">
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Modelo de Recomendação de Preços</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Gerenciamento e treinamento do modelo de Machine Learning que recomenda valores de frete
            </p>
          </div>

          {modelState ? (
            <>
              {/* Cards com estatísticas principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary-foreground">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-primary/10 rounded-full p-3 mb-3">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-3xl font-bold">{modelState.samplesCount || 0}</div>
                      <p className="text-sm text-muted-foreground mt-1">Registros para Treinamento</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary-foreground">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-primary/10 rounded-full p-3 mb-3">
                        <Lightbulb className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-3xl font-bold">{modelState.feedbackCount || 0}</div>
                      <p className="text-sm text-muted-foreground mt-1">Feedbacks de Usuários</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary-foreground">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-primary/10 rounded-full p-3 mb-3">
                        <Eye className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-3xl font-bold">
                        {modelState.metrics?.r2 !== undefined 
                          ? `${(modelState.metrics.r2 * 100).toFixed(1)}%` 
                          : "N/A"}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Precisão do Modelo</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary-foreground">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-primary/10 rounded-full p-3 mb-3">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-3xl font-bold">{modelState.newSamplesCount}</div>
                      <p className="text-sm text-muted-foreground mt-1">Novas Amostras</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Progresso para próximo treinamento */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Progresso para Próximo Treinamento</CardTitle>
                    </div>
                    <span className="text-sm font-medium">{modelState.newSamplesCount}/{modelState.retrainingThreshold}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <Progress 
                    value={(modelState.newSamplesCount / modelState.retrainingThreshold) * 100} 
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    O modelo será retreinado automaticamente após coletar {modelState.retrainingThreshold} 
                    novas amostras ou feedbacks.
                  </p>
                </CardContent>
              </Card>
              
              {/* Detalhes do Modelo e Métricas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ModelDetails modelState={modelState} />
                <PerformanceMetrics metrics={modelState.metrics} />
              </div>
              
              {/* Importância de Features */}
              {modelState.metrics?.feature_importance && Object.keys(modelState.metrics.feature_importance).length > 0 && (
                <FeatureImportance featureImportance={modelState.metrics.feature_importance} />
              )}
              
              {/* Seção de Ações */}
              <Card className="bg-muted/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="h-5 w-5 text-primary" />
                    <CardTitle>Ações do Modelo</CardTitle>
                  </div>
                  <CardDescription>
                    Gerencie o treinamento e atualização do modelo
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-4">
                    <div className="bg-card p-4 rounded-md border">
                      <h3 className="font-semibold mb-2">Forçar Retreinamento do Modelo</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        O retreinamento forçado fará com que o modelo aprenda com todas as {modelState.samplesCount} 
                        cotações disponíveis e {modelState.feedbackCount} feedbacks de usuários. 
                        Isso pode melhorar a precisão das recomendações.
                      </p>
                      <Button 
                        onClick={handleForceTraining} 
                        disabled={isTrainingLoading}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        {isTrainingLoading ? (
                          <>
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                            <span>Treinando modelo...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCcw className="h-4 w-4" />
                            <span>Retreinar Modelo Agora</span>
                          </>
                        )}
                      </Button>
                      {modelState.metrics?.r2 !== undefined && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Precisão atual do modelo: {(modelState.metrics.r2 * 100).toFixed(2)}% | 
                          Erro médio: R$ {modelState.metrics.mae?.toFixed(2) || 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            // Estado de carregamento
            <div className="flex flex-col justify-center items-center h-60 gap-3">
              <RefreshCcw className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando estatísticas do modelo...</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="database" className="space-y-4 mt-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Banco de Dados</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Acesso e gerenciamento dos dados do sistema
            </p>
          </div>
          
          <div className="bg-muted/30 p-8 rounded-lg text-center">
            <BarChart2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Módulo em Desenvolvimento</h3>
            <p>O acesso ao banco de dados será implementado em versões futuras.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Usuários</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de usuários e permissões
            </p>
          </div>
          
          <div className="bg-muted/30 p-8 rounded-lg text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Módulo em Desenvolvimento</h3>
            <p>O gerenciamento de usuários será implementado em versões futuras.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;