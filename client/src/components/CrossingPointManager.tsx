import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Tipo para o ponto de travessia
interface CrossingPoint {
  id?: string;
  name: string;
  description: string;
  active: boolean;
  brazilianSide: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  paraguayanSide: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  faf: {
    perTruck: string;
    lot1000: string;
    lot1500: string;
  };
  fula: {
    enabled: boolean;
    costPerTon: string | null;
  };
  mapa: {
    costPerTon: string | null;
    acerto: string | null;
    fixo: string | null;
    lot1000: string | null;
    lot1500: string | null;
  };
  dinatran: {
    enabled: boolean;
    costPerTruck: string | null;
  };
  balsa: {
    enabled: boolean;
    defaultCost: number | null;
    puertoIndioCost: number | null;
    sangaFundaCost: number | null;
  };
  estacionamento: {
    enabled: boolean;
    costPerTruck: string | null;
  };
  comissaoLuiz: {
    enabled: boolean;
    costPerTon: string | null;
  };
  otherFees: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

const CrossingPointManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCrossingPoint, setSelectedCrossingPoint] = useState<CrossingPoint | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("general");
  
  // Consulta para buscar todos os pontos de travessia
  const { data: crossingPoints, isLoading } = useQuery({
    queryKey: ['/api/crossing-points'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/crossing-points');
      const data = await response.json();
      console.log('Pontos de travessia carregados:', data);
      return data || [];
    }
  });
  
  // Mutação para atualizar um ponto de travessia
  const updateCrossingPointMutation = useMutation({
    mutationFn: async (data: CrossingPoint) => {
      if (!data.id) throw new Error("ID do ponto de travessia não fornecido");
      return await apiRequest('PUT', `/api/crossing-points/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Ponto de travessia atualizado",
        description: "As informações foram atualizadas com sucesso.",
        variant: "success"
      });
      
      // Fechar o diálogo e invalidar a consulta para atualizar a lista
      setIsEditDialogOpen(false);
      setSelectedCrossingPoint(null);
      queryClient.invalidateQueries({ queryKey: ['/api/crossing-points'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar ponto de travessia",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar os dados",
        variant: "destructive"
      });
    }
  });
  
  // Função para abrir o diálogo de edição
  const handleEdit = (crossingPoint: CrossingPoint) => {
    setSelectedCrossingPoint(crossingPoint);
    setIsEditDialogOpen(true);
    setSelectedTab("general");
  };
  
  // Função para salvar alterações
  const handleSave = () => {
    if (selectedCrossingPoint) {
      updateCrossingPointMutation.mutate(selectedCrossingPoint);
    }
  };

  // Função para atualizar um campo aninhado
  const updateNestedField = (
    mainField: keyof CrossingPoint, 
    subField: string, 
    value: any
  ) => {
    if (selectedCrossingPoint) {
      setSelectedCrossingPoint({
        ...selectedCrossingPoint,
        [mainField]: {
          ...selectedCrossingPoint[mainField],
          [subField]: value
        }
      });
    }
  };
  
  return (
    <div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Pontos de Travessia Brasil-Paraguai</CardTitle>
          <CardDescription>
            Gerencie os custos e configurações dos pontos de travessia entre Brasil e Paraguai.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="lg" />
              <span className="ml-3">Carregando pontos de travessia...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-100 dark:bg-neutral-800">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium">Nome</th>
                      <th className="py-3 px-4 text-left text-sm font-medium">Lado Brasileiro</th>
                      <th className="py-3 px-4 text-left text-sm font-medium">Lado Paraguaio</th>
                      <th className="py-3 px-4 text-left text-sm font-medium">FAF (GS)</th>
                      <th className="py-3 px-4 text-left text-sm font-medium">Balsa</th>
                      <th className="py-3 px-4 text-left text-sm font-medium">Status</th>
                      <th className="py-3 px-4 text-left text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {crossingPoints?.map((crossingPoint: CrossingPoint) => (
                      <tr key={crossingPoint.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <td className="py-3 px-4 text-sm font-medium">{crossingPoint.name}</td>
                        <td className="py-3 px-4 text-sm">{crossingPoint.brazilianSide.name}</td>
                        <td className="py-3 px-4 text-sm">{crossingPoint.paraguayanSide.name}</td>
                        <td className="py-3 px-4 text-sm">{crossingPoint.faf.perTruck} GS</td>
                        <td className="py-3 px-4 text-sm">
                          {crossingPoint.balsa.enabled ? 
                            (crossingPoint.balsa.defaultCost ? `${crossingPoint.balsa.defaultCost} BRL` : 
                            crossingPoint.balsa.puertoIndioCost ? `${crossingPoint.balsa.puertoIndioCost} BRL` : 
                            crossingPoint.balsa.sangaFundaCost ? `${crossingPoint.balsa.sangaFundaCost} BRL` : 'Sim') : 
                            'Não'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Badge variant={crossingPoint.active ? "success" : "outline"}>
                            {crossingPoint.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(crossingPoint)}
                          >
                            Editar Configurações
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Diálogo para edição de um ponto de travessia */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Ponto de Travessia: {selectedCrossingPoint?.name}
              <Badge className="ml-2" variant={selectedCrossingPoint?.active ? "success" : "outline"}>
                {selectedCrossingPoint?.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Configure os custos e parâmetros do ponto de travessia entre Brasil e Paraguai.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCrossingPoint && (
            <div className="space-y-4">
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="general">Geral</TabsTrigger>
                  <TabsTrigger value="faf">FAF</TabsTrigger>
                  <TabsTrigger value="balsa">Balsa</TabsTrigger>
                  <TabsTrigger value="fula">FULA</TabsTrigger>
                  <TabsTrigger value="mapa">Mapa/Ministério</TabsTrigger>
                  <TabsTrigger value="other">Outras Taxas</TabsTrigger>
                </TabsList>
                
                {/* Aba Informações Gerais */}
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Informações Básicas</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="active" 
                            checked={selectedCrossingPoint.active}
                            onCheckedChange={(checked) => {
                              setSelectedCrossingPoint({
                                ...selectedCrossingPoint,
                                active: checked
                              });
                            }}
                          />
                          <Label htmlFor="active">Ponto de travessia ativo</Label>
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Descrição</Label>
                          <Input 
                            id="description" 
                            value={selectedCrossingPoint.description}
                            onChange={(e) => {
                              setSelectedCrossingPoint({
                                ...selectedCrossingPoint,
                                description: e.target.value
                              });
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Lado Brasileiro</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 space-y-3">
                        <div>
                          <Label htmlFor="brSideName">Nome</Label>
                          <Input 
                            id="brSideName" 
                            value={selectedCrossingPoint.brazilianSide.name}
                            onChange={(e) => updateNestedField('brazilianSide', 'name', e.target.value)}
                            disabled
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="brSideLat">Latitude</Label>
                            <Input 
                              id="brSideLat" 
                              type="number"
                              step="0.0001"
                              value={selectedCrossingPoint.brazilianSide.coordinates.lat}
                              onChange={(e) => {
                                setSelectedCrossingPoint({
                                  ...selectedCrossingPoint,
                                  brazilianSide: {
                                    ...selectedCrossingPoint.brazilianSide,
                                    coordinates: {
                                      ...selectedCrossingPoint.brazilianSide.coordinates,
                                      lat: parseFloat(e.target.value)
                                    }
                                  }
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor="brSideLng">Longitude</Label>
                            <Input 
                              id="brSideLng" 
                              type="number"
                              step="0.0001"
                              value={selectedCrossingPoint.brazilianSide.coordinates.lng}
                              onChange={(e) => {
                                setSelectedCrossingPoint({
                                  ...selectedCrossingPoint,
                                  brazilianSide: {
                                    ...selectedCrossingPoint.brazilianSide,
                                    coordinates: {
                                      ...selectedCrossingPoint.brazilianSide.coordinates,
                                      lng: parseFloat(e.target.value)
                                    }
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Lado Paraguaio</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 space-y-3">
                        <div>
                          <Label htmlFor="pySideName">Nome</Label>
                          <Input 
                            id="pySideName" 
                            value={selectedCrossingPoint.paraguayanSide.name}
                            onChange={(e) => updateNestedField('paraguayanSide', 'name', e.target.value)}
                            disabled
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="pySideLat">Latitude</Label>
                            <Input 
                              id="pySideLat" 
                              type="number"
                              step="0.0001"
                              value={selectedCrossingPoint.paraguayanSide.coordinates.lat}
                              onChange={(e) => {
                                setSelectedCrossingPoint({
                                  ...selectedCrossingPoint,
                                  paraguayanSide: {
                                    ...selectedCrossingPoint.paraguayanSide,
                                    coordinates: {
                                      ...selectedCrossingPoint.paraguayanSide.coordinates,
                                      lat: parseFloat(e.target.value)
                                    }
                                  }
                                });
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor="pySideLng">Longitude</Label>
                            <Input 
                              id="pySideLng" 
                              type="number"
                              step="0.0001"
                              value={selectedCrossingPoint.paraguayanSide.coordinates.lng}
                              onChange={(e) => {
                                setSelectedCrossingPoint({
                                  ...selectedCrossingPoint,
                                  paraguayanSide: {
                                    ...selectedCrossingPoint.paraguayanSide,
                                    coordinates: {
                                      ...selectedCrossingPoint.paraguayanSide.coordinates,
                                      lng: parseFloat(e.target.value)
                                    }
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Estacionamento</CardTitle>
                        <CardDescription>Valores em Reais (BRL)</CardDescription>
                      </CardHeader>
                      <CardContent className="py-2 space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="hasEstacionamento" 
                            checked={selectedCrossingPoint.estacionamento.enabled}
                            onCheckedChange={(checked) => updateNestedField('estacionamento', 'enabled', !!checked)}
                          />
                          <Label htmlFor="hasEstacionamento">Cobra estacionamento</Label>
                        </div>
                        
                        {selectedCrossingPoint.estacionamento.enabled && (
                          <div>
                            <Label htmlFor="estacionamentoCost">Valor por Caminhão (BRL)</Label>
                            <Input 
                              id="estacionamentoCost" 
                              type="number" 
                              step="0.01"
                              value={selectedCrossingPoint.estacionamento.costPerTruck || ""}
                              onChange={(e) => updateNestedField('estacionamento', 'costPerTruck', e.target.value)}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Aba FAF */}
                <TabsContent value="faf" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>FAF (Fundo Aduaneiro Fronteiriço)</CardTitle>
                      <CardDescription>Valores em Guaranis (GS)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="fafPerTruck">Por Caminhão (GS)</Label>
                        <Input 
                          id="fafPerTruck" 
                          type="number" 
                          value={selectedCrossingPoint.faf.perTruck}
                          onChange={(e) => updateNestedField('faf', 'perTruck', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fafLot1000">Lote até 1000 ton (GS)</Label>
                        <Input 
                          id="fafLot1000" 
                          type="number" 
                          value={selectedCrossingPoint.faf.lot1000}
                          onChange={(e) => updateNestedField('faf', 'lot1000', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fafLot1500">Lote acima 1000 ton (GS)</Label>
                        <Input 
                          id="fafLot1500" 
                          type="number" 
                          value={selectedCrossingPoint.faf.lot1500}
                          onChange={(e) => updateNestedField('faf', 'lot1500', e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Aba Balsa */}
                <TabsContent value="balsa" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Balsa</CardTitle>
                      <CardDescription>Valores em Reais (BRL)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="hasBalsa" 
                          checked={selectedCrossingPoint.balsa.enabled}
                          onCheckedChange={(checked) => updateNestedField('balsa', 'enabled', !!checked)}
                        />
                        <Label htmlFor="hasBalsa">Utiliza balsa</Label>
                      </div>
                      
                      {selectedCrossingPoint.balsa.enabled && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="balsaDefaultCost">Custo Padrão (BRL)</Label>
                            <Input 
                              id="balsaDefaultCost" 
                              type="number" 
                              step="0.01"
                              value={selectedCrossingPoint.balsa.defaultCost || ""}
                              onChange={(e) => updateNestedField('balsa', 'defaultCost', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              Utilizado quando não há custo específico para Puerto Indio ou Sanga Funda
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="balsaPuertoIndioCost">Custo Puerto Indio (BRL)</Label>
                            <Input 
                              id="balsaPuertoIndioCost" 
                              type="number" 
                              step="0.01"
                              value={selectedCrossingPoint.balsa.puertoIndioCost || ""}
                              onChange={(e) => updateNestedField('balsa', 'puertoIndioCost', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="balsaSangaFundaCost">Custo Sanga Funda (BRL)</Label>
                            <Input 
                              id="balsaSangaFundaCost" 
                              type="number" 
                              step="0.01"
                              value={selectedCrossingPoint.balsa.sangaFundaCost || ""}
                              onChange={(e) => updateNestedField('balsa', 'sangaFundaCost', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Aba FULA */}
                <TabsContent value="fula" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>FULA</CardTitle>
                        <CardDescription>Valores em Dólares (USD)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="hasFula" 
                            checked={selectedCrossingPoint.fula.enabled}
                            onCheckedChange={(checked) => updateNestedField('fula', 'enabled', !!checked)}
                          />
                          <Label htmlFor="hasFula">Aduana cobra FULA</Label>
                        </div>
                        
                        {selectedCrossingPoint.fula.enabled && (
                          <div>
                            <Label htmlFor="fulaCost">Valor por Tonelada (USD)</Label>
                            <Input 
                              id="fulaCost" 
                              type="number" 
                              step="0.01"
                              value={selectedCrossingPoint.fula.costPerTon || ""}
                              onChange={(e) => updateNestedField('fula', 'costPerTon', e.target.value)}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>DINATRAN</CardTitle>
                        <CardDescription>Valores em Reais (BRL)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="hasDinatran" 
                            checked={selectedCrossingPoint.dinatran.enabled}
                            onCheckedChange={(checked) => updateNestedField('dinatran', 'enabled', !!checked)}
                          />
                          <Label htmlFor="hasDinatran">Cobra DINATRAN</Label>
                        </div>
                        
                        {selectedCrossingPoint.dinatran.enabled && (
                          <div>
                            <Label htmlFor="dinatranCost">Valor por Caminhão (BRL)</Label>
                            <Input 
                              id="dinatranCost" 
                              type="number" 
                              step="0.01"
                              value={selectedCrossingPoint.dinatran.costPerTruck || ""}
                              onChange={(e) => updateNestedField('dinatran', 'costPerTruck', e.target.value)}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Comissão Luiz Baciquet</CardTitle>
                        <CardDescription>Valores em Reais (BRL)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="hasComissaoLuiz" 
                            checked={selectedCrossingPoint.comissaoLuiz.enabled}
                            onCheckedChange={(checked) => updateNestedField('comissaoLuiz', 'enabled', !!checked)}
                          />
                          <Label htmlFor="hasComissaoLuiz">Cobra comissão Luiz</Label>
                        </div>
                        
                        {selectedCrossingPoint.comissaoLuiz.enabled && (
                          <div>
                            <Label htmlFor="comissaoLuizCost">Valor por Tonelada (BRL)</Label>
                            <Input 
                              id="comissaoLuizCost" 
                              type="number" 
                              step="0.01"
                              value={selectedCrossingPoint.comissaoLuiz.costPerTon || ""}
                              onChange={(e) => updateNestedField('comissaoLuiz', 'costPerTon', e.target.value)}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Aba Mapa/Ministério */}
                <TabsContent value="mapa" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mapa/Ministério</CardTitle>
                      <CardDescription>Valores em diferentes moedas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="mapaCostPerTon">Valor por Tonelada (USD)</Label>
                          <Input 
                            id="mapaCostPerTon" 
                            type="number" 
                            step="0.01"
                            value={selectedCrossingPoint.mapa.costPerTon || ""}
                            onChange={(e) => updateNestedField('mapa', 'costPerTon', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="mapaAcerto">Valor Acerto (USD/ton)</Label>
                          <Input 
                            id="mapaAcerto" 
                            type="number" 
                            step="0.01"
                            value={selectedCrossingPoint.mapa.acerto || ""}
                            onChange={(e) => updateNestedField('mapa', 'acerto', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="mapaFixo">Valor Fixo (USD/ton)</Label>
                          <Input 
                            id="mapaFixo" 
                            type="number" 
                            step="0.01"
                            value={selectedCrossingPoint.mapa.fixo || ""}
                            onChange={(e) => updateNestedField('mapa', 'fixo', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="mapaLot1000">Lote até 1000 ton (BRL)</Label>
                          <Input 
                            id="mapaLot1000" 
                            type="number" 
                            step="0.01"
                            value={selectedCrossingPoint.mapa.lot1000 || ""}
                            onChange={(e) => updateNestedField('mapa', 'lot1000', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="mapaLot1500">Lote acima 1000 ton (BRL)</Label>
                          <Input 
                            id="mapaLot1500" 
                            type="number" 
                            step="0.01"
                            value={selectedCrossingPoint.mapa.lot1500 || ""}
                            onChange={(e) => updateNestedField('mapa', 'lot1500', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Aba Outras Taxas */}
                <TabsContent value="other" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Outras Taxas</CardTitle>
                      <CardDescription>
                        Taxas adicionais específicas deste ponto de travessia
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">
                          Esta seção permite a configuração de taxas personalizadas.
                          Para adicionar uma nova taxa, entre em contato com o administrador do sistema.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateCrossingPointMutation.isPending}
            >
              {updateCrossingPointMutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Salvando...
                </>
              ) : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CrossingPointManager;