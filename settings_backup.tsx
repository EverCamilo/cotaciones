import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import CrossingPointManager from "@/components/CrossingPointManager";

// Interface de configurações
  id?: string;
  name: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  partnerAduana: string | null;
  fafPerTruck: string;
  fafLot1000: string;
  fafLot1500: string;
  hasFula: boolean;
  fulaCost?: string | null;
  hasBalsa: boolean;
  balsaCost?: any;
  hasEstacionamento: boolean;
  estacionamentoCost?: string | null;
  mapaCost?: string | null;
  mapaAcerto?: string | null;
  mapaFixo?: string | null;
  mapaCost1000?: string | null;
  mapaCost1500?: string | null;
  dinatranCost?: string | null;
  hasComissaoLuiz: boolean;
  comissaoLuiz?: string | null;
  otherFees?: Record<string, any>;
}

// Componente de gerenciamento de aduanas
const AduanasManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAduana, setSelectedAduana] = useState<AduanaInfo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Consulta para buscar todas as aduanas
  const { data: aduanas, isLoading: isLoadingAduanas } = useQuery({
    queryKey: ['/api/aduanas'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/aduanas');
      const data = await response.json();
      console.log('Aduanas carregadas:', data);
      return data || [];
    }
  });
  
  // Mutação para atualizar uma aduana
  const updateAduanaMutation = useMutation({
    mutationFn: async (data: AduanaInfo) => {
      if (!data.id) throw new Error("ID da aduana não fornecido");
      return await apiRequest('PUT', `/api/aduanas/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Aduana atualizada",
        description: "As informações da aduana foram atualizadas com sucesso.",
        variant: "success"
      });
      
      // Fechar o diálogo e invalidar a consulta para atualizar a lista
      setIsEditDialogOpen(false);
      setSelectedAduana(null);
      queryClient.invalidateQueries({ queryKey: ['/api/aduanas'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar aduana",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar os dados da aduana",
        variant: "destructive"
      });
    }
  });
  
  // Filtrar aduanas brasileiras e paraguaias
  const brazilianAduanas = aduanas?.filter((aduana: any) => aduana.country === 'BR') || [];
  const paraguayanAduanas = aduanas?.filter((aduana: any) => aduana.country === 'PY') || [];
  
  // Função para abrir o diálogo de edição
  const handleEditAduana = (aduana: AduanaInfo) => {
    setSelectedAduana(aduana);
    setIsEditDialogOpen(true);
  };
  
  // Função para salvar alterações
  const handleSaveAduana = () => {
    if (selectedAduana) {
      updateAduanaMutation.mutate(selectedAduana);
    }
  };
  
  // Função para atualizar o valor do campo na aduana selecionada
  const updateField = (field: keyof AduanaInfo, value: any) => {
    if (selectedAduana) {
      setSelectedAduana({
        ...selectedAduana,
        [field]: value
      });
    }
  };
  
  return (
    <div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Configuração de Aduanas</CardTitle>
          <CardDescription>
            Gerencie os custos e configurações das aduanas.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoadingAduanas ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="lg" />
              <span className="ml-3">Carregando aduanas...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Aduanas Brasileiras */}
              <div>
                <h3 className="text-lg font-medium mb-2">Aduanas Brasileiras</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-100 dark:bg-neutral-800">
                      <tr>
                        <th className="py-3 px-4 text-left text-sm font-medium">Nome</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Aduana Parceira</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">FAF (GS)</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">FULA</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Balsa</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {brazilianAduanas.map((aduana: any) => (
                        <tr key={aduana.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                          <td className="py-3 px-4 text-sm">{aduana.name}</td>
                          <td className="py-3 px-4 text-sm">{aduana.partnerAduana || '-'}</td>
                          <td className="py-3 px-4 text-sm">{aduana.fafPerTruck}</td>
                          <td className="py-3 px-4 text-sm">
                            {aduana.hasFula ? `${aduana.fulaCost} USD/ton` : 'Não'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {aduana.hasBalsa ? 
                              (aduana.balsaCost?.default ? `${aduana.balsaCost.default} BRL` : 
                              aduana.balsaCost?.puerto_indio ? `${aduana.balsaCost.puerto_indio} BRL` : 'Sim') : 
                              'Não'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditAduana(aduana)}
                            >
                              Editar Custos
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Aduanas Paraguaias */}
              <div>
                <h3 className="text-lg font-medium mb-2">Aduanas Paraguaias</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-100 dark:bg-neutral-800">
                      <tr>
                        <th className="py-3 px-4 text-left text-sm font-medium">Nome</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Aduana Parceira</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Latitude</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Longitude</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paraguayanAduanas.map((aduana: any) => (
                        <tr key={aduana.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                          <td className="py-3 px-4 text-sm">{aduana.name}</td>
                          <td className="py-3 px-4 text-sm">{aduana.partnerAduana || '-'}</td>
                          <td className="py-3 px-4 text-sm">{aduana.coordinates.lat}</td>
                          <td className="py-3 px-4 text-sm">{aduana.coordinates.lng}</td>
                          <td className="py-3 px-4 text-sm">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditAduana(aduana)}
                            >
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Diálogo para edição de uma aduana */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Aduana: {selectedAduana?.name}
              <span className="ml-2 inline-block px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 dark:bg-neutral-800">
                {selectedAduana?.country === 'BR' ? 'Brasil' : 'Paraguai'}
              </span>
            </DialogTitle>
            <DialogDescription>
              Configure os custos e parâmetros da aduana.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAduana && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seção FAF */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">FAF (Fundo Aduaneiro Fronteiriço)</CardTitle>
                  <CardDescription>Valores em Guaranis (GS)</CardDescription>
                </CardHeader>
                <CardContent className="py-2 space-y-3">
                  <div>
                    <Label htmlFor="fafPerTruck">Por Caminhão (GS)</Label>
                    <Input 
                      id="fafPerTruck" 
                      type="number" 
                      value={selectedAduana.fafPerTruck}
                      onChange={(e) => updateField('fafPerTruck', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fafLot1000">Lote até 1000 ton (GS)</Label>
                    <Input 
                      id="fafLot1000" 
                      type="number" 
                      value={selectedAduana.fafLot1000}
                      onChange={(e) => updateField('fafLot1000', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fafLot1500">Lote acima 1000 ton (GS)</Label>
                    <Input 
                      id="fafLot1500" 
                      type="number" 
                      value={selectedAduana.fafLot1500}
                      onChange={(e) => updateField('fafLot1500', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Seção FULA */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">FULA</CardTitle>
                  <CardDescription>Valores em Dólares (USD)</CardDescription>
                </CardHeader>
                <CardContent className="py-2 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hasFula" 
                      checked={selectedAduana.hasFula}
                      onCheckedChange={(checked) => updateField('hasFula', checked)}
                    />
                    <Label htmlFor="hasFula">Aduana cobra FULA</Label>
                  </div>
                  
                  {selectedAduana.hasFula && (
                    <div>
                      <Label htmlFor="fulaCost">Valor por Tonelada (USD)</Label>
                      <Input 
                        id="fulaCost" 
                        type="number" 
                        step="0.01"
                        value={selectedAduana.fulaCost || ""}
                        onChange={(e) => updateField('fulaCost', e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Seção Mapa/Ministério */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Mapa/Ministério</CardTitle>
                  <CardDescription>Valores em diferentes moedas</CardDescription>
                </CardHeader>
                <CardContent className="py-2 space-y-3">
                  <div>
                    <Label htmlFor="mapaCost">Valor por Tonelada (USD)</Label>
                    <Input 
                      id="mapaCost" 
                      type="number" 
                      step="0.01"
                      value={selectedAduana.mapaCost || ""}
                      onChange={(e) => updateField('mapaCost', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mapaAcerto">Valor Acerto (USD/ton)</Label>
                    <Input 
                      id="mapaAcerto" 
                      type="number" 
                      step="0.01"
                      value={selectedAduana.mapaAcerto || ""}
                      onChange={(e) => updateField('mapaAcerto', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mapaFixo">Valor Fixo (USD/ton)</Label>
                    <Input 
                      id="mapaFixo" 
                      type="number" 
                      step="0.01"
                      value={selectedAduana.mapaFixo || ""}
                      onChange={(e) => updateField('mapaFixo', e.target.value)}
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <Label htmlFor="mapaCost1000">Lote até 1000 ton (BRL)</Label>
                    <Input 
                      id="mapaCost1000" 
                      type="number" 
                      step="0.01"
                      value={selectedAduana.mapaCost1000 || ""}
                      onChange={(e) => updateField('mapaCost1000', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mapaCost1500">Lote acima 1000 ton (BRL)</Label>
                    <Input 
                      id="mapaCost1500" 
                      type="number" 
                      step="0.01"
                      value={selectedAduana.mapaCost1500 || ""}
                      onChange={(e) => updateField('mapaCost1500', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Seção Balsa */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Balsa</CardTitle>
                  <CardDescription>Valores em Reais (BRL)</CardDescription>
                </CardHeader>
                <CardContent className="py-2 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hasBalsa" 
                      checked={selectedAduana.hasBalsa}
                      onCheckedChange={(checked) => updateField('hasBalsa', checked)}
                    />
                    <Label htmlFor="hasBalsa">Aduana utiliza balsa</Label>
                  </div>
                  
                  {selectedAduana.hasBalsa && (
                    <>
                      <div>
                        <Label htmlFor="balsaCost">Valor Balsa Padrão (BRL)</Label>
                        <Input 
                          id="balsaCost" 
                          type="number" 
                          step="0.01"
                          value={selectedAduana.balsaCost?.default || ""}
                          onChange={(e) => updateField('balsaCost', {
                            ...selectedAduana.balsaCost || {},
                            default: e.target.value
                          })}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="balsaPuertoIndio">Valor Puerto Indio (BRL)</Label>
                        <Input 
                          id="balsaPuertoIndio" 
                          type="number" 
                          step="0.01"
                          value={selectedAduana.balsaCost?.puerto_indio || ""}
                          onChange={(e) => updateField('balsaCost', {
                            ...selectedAduana.balsaCost || {},
                            puerto_indio: e.target.value
                          })}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Seção Outros Custos */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Outros Custos</CardTitle>
                  <CardDescription>Custos adicionais da aduana</CardDescription>
                </CardHeader>
                <CardContent className="py-2 space-y-3">
                  {/* Estacionamento */}
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hasEstacionamento" 
                      checked={selectedAduana.hasEstacionamento}
                      onCheckedChange={(checked) => updateField('hasEstacionamento', checked)}
                    />
                    <Label htmlFor="hasEstacionamento">Aduana cobra estacionamento</Label>
                  </div>
                  
                  {selectedAduana.hasEstacionamento && (
                    <div>
                      <Label htmlFor="estacionamentoCost">Valor Estacionamento (BRL)</Label>
                      <Input 
                        id="estacionamentoCost" 
                        type="number" 
                        step="0.01"
                        value={selectedAduana.estacionamentoCost || ""}
                        onChange={(e) => updateField('estacionamentoCost', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Dinatran */}
                  <div className="pt-2 border-t">
                    <Label htmlFor="dinatranCost">Dinatran (BRL/caminhão)</Label>
                    <Input 
                      id="dinatranCost" 
                      type="number" 
                      step="0.01"
                      value={selectedAduana.dinatranCost || ""}
                      onChange={(e) => updateField('dinatranCost', e.target.value)}
                    />
                  </div>

                  {/* Comissão Luiz Baciquet */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="hasComissaoLuiz" 
                        checked={selectedAduana.hasComissaoLuiz}
                        onCheckedChange={(checked) => updateField('hasComissaoLuiz', checked)}
                      />
                      <Label htmlFor="hasComissaoLuiz">Aduana cobra comissão Luiz Baciquet</Label>
                    </div>
                    
                    {selectedAduana.hasComissaoLuiz && (
                      <div className="mt-2">
                        <Label htmlFor="comissaoLuiz">Valor Comissão (BRL/ton)</Label>
                        <Input 
                          id="comissaoLuiz" 
                          type="number" 
                          step="0.01"
                          value={selectedAduana.comissaoLuiz || ""}
                          onChange={(e) => updateField('comissaoLuiz', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAduana}
              disabled={updateAduanaMutation.isPending}
            >
              {updateAduanaMutation.isPending ? (
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


const Settings = () => {
  return (
    <div className="px-6 py-4 max-w-full">
      <h1 className="text-2xl font-bold mb-4">Configurações</h1>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="crossing-points">Pontos de Travessia</TabsTrigger>
          <TabsTrigger value="api">Integrações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Configure as preferências básicas do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">

                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda Principal</Label>
                  <select 
                    id="currency" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="USD">USD - Dólar Americano</option>
                    <option value="BRL">BRL - Real Brasileiro</option>
                    <option value="PYG">PYG - Guarani Paraguaio</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profit_margin">Margem de Lucro Padrão (USD/ton)</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-neutral-500 dark:text-neutral-400">$</span>
                    </div>
                    <Input 
                      id="profit_margin" 
                      type="number" 
                      min="0" 
                      step="0.1" 
                      className="pl-10" 
                      defaultValue="4.00" 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este valor será usado como padrão em todas as novas cotações.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tonnage">Tonelagem Padrão (ton)</Label>
                  <div className="relative">
                    <Input 
                      id="tonnage" 
                      type="number" 
                      min="0" 
                      step="10" 
                      className="pr-14" 
                      defaultValue="1000" 
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-neutral-500 dark:text-neutral-400">ton</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor inicial para novas cotações.
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Escuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar tema escuro automaticamente.
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas sobre atualizações de cotação.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Button className="w-full">Salvar Configurações</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        
        <TabsContent value="crossing-points">
          <CrossingPointManager />
        </TabsContent>
        
        <TabsContent value="api">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Integrações API</CardTitle>
              <CardDescription>
                Configure as chaves de API e serviços externos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="google_api">Chave API Google Maps</Label>
                <Input id="google_api" type="password" value="●●●●●●●●●●●●●●●●●●●●" />
                <p className="text-xs text-muted-foreground">
                  Utilizada para cálculos de distância e geolocalização.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency_api">API de Câmbio</Label>
                <Input id="currency_api" placeholder="Insira sua chave de API de câmbio" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo de Teste</Label>
                  <p className="text-sm text-muted-foreground">
                    Desativar solicitações reais às APIs externas.
                  </p>
                </div>
                <Switch />
              </div>
              
              <Button className="w-full">Salvar Configurações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;