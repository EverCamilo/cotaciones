import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import CrossingPointManager from "@/components/CrossingPointManager";
import { apiRequest } from "../lib/queryClient";

const Settings = () => {
  const [settings, setSettings] = useState({
    defaultProfitMargin: 4.0,
    defaultTonnage: 1000,
    darkMode: false,
    notifications: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Carregar configurações ao iniciar
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('GET', '/api/app-settings');
        const data = await response.json();
        setSettings({
          defaultProfitMargin: data.defaultProfitMargin || 4.0,
          defaultTonnage: data.defaultTonnage || 1000,
          darkMode: data.darkMode || false,
          notifications: data.notifications ?? true
        });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as configurações",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  // Função para salvar configurações
  const saveSettings = async () => {
    try {
      setIsLoading(true);
      await apiRequest('PATCH', '/api/app-settings', settings);
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manipuladores de eventos para campos
  const handleProfitMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSettings(prev => ({ ...prev, defaultProfitMargin: isNaN(value) ? 0 : value }));
  };

  const handleTonnageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSettings(prev => ({ ...prev, defaultTonnage: isNaN(value) ? 0 : value }));
  };

  const handleDarkModeChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, darkMode: checked }));
  };

  const handleNotificationsChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, notifications: checked }));
  };
  


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

                {/* A moeda principal será sempre USD conforme solicitado pelo cliente */}
                
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
                      value={settings.defaultProfitMargin}
                      onChange={handleProfitMarginChange}
                      disabled={isLoading}
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
                      value={settings.defaultTonnage}
                      onChange={handleTonnageChange}
                      disabled={isLoading}
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
                  <Switch 
                    checked={settings.darkMode} 
                    onCheckedChange={handleDarkModeChange}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas sobre atualizações de cotação.
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications} 
                    onCheckedChange={handleNotificationsChange}
                    disabled={isLoading}
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={saveSettings}
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
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
                <Input id="google_api" type="password" value="●●●●●●●●●●●●●●●●●●●●" disabled />
                <p className="text-xs text-muted-foreground">
                  Utilizada para cálculos de distância e geolocalização.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency_api">API de Câmbio</Label>
                <Input id="currency_api" placeholder="Insira sua chave de API de câmbio" disabled />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo de Teste</Label>
                  <p className="text-sm text-muted-foreground">
                    Desativar solicitações reais às APIs externas.
                  </p>
                </div>
                <Switch disabled />
              </div>
              
              <Button className="w-full" disabled>Salvar Configurações</Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Para modificar chaves de API, entre em contato com o administrador do sistema.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;