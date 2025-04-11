import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Globe, ArrowRightLeft, Database, TrendingUp } from "lucide-react";
import { useState } from "react";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("system");

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações globais do sistema de cálculo de fretes.
        </p>
      </div>

      <Tabs defaultValue="system" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid grid-cols-3 md:grid-cols-5 h-auto p-1">
          <TabsTrigger value="system" className="flex items-center gap-2 py-2">
            <Database className="h-4 w-4" />
            <span className="hidden md:inline">Sistema</span>
          </TabsTrigger>
          <TabsTrigger value="coordinates" className="flex items-center gap-2 py-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden md:inline">Coordenadas</span>
          </TabsTrigger>
          <TabsTrigger value="aduanas" className="flex items-center gap-2 py-2">
            <Globe className="h-4 w-4" />
            <span className="hidden md:inline">Aduanas</span>
          </TabsTrigger>
          <TabsTrigger value="exchange" className="flex items-center gap-2 py-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden md:inline">Câmbio</span>
          </TabsTrigger>
          <TabsTrigger value="prices" className="flex items-center gap-2 py-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden md:inline">Preços</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Configure os parâmetros globais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ajuste parâmetros gerais utilizados em todos os cálculos de frete.
              </p>
              
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Em desenvolvimento</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        As configurações do sistema estarão disponíveis em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coordinates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coordenadas de Locais</CardTitle>
              <CardDescription>
                Configure coordenadas precisas para locais frequentemente utilizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Esta funcionalidade permite definir coordenadas específicas que serão usadas nos cálculos 
                de rota, especialmente quando a API do Google Maps não retornar resultados precisos.
              </p>

              <div className="rounded-md bg-amber-50 p-4 border border-amber-200 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Em desenvolvimento</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        A configuração de coordenadas personalizadas estará disponível em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aduanas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Aduanas</CardTitle>
              <CardDescription>
                Gerencie informações sobre os postos aduaneiros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure as informações sobre aduanas, incluindo taxas, custos e outros parâmetros
                específicos de cada posto aduaneiro.
              </p>
              
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Em desenvolvimento</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        A configuração de aduanas estará disponível em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exchange" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Câmbio</CardTitle>
              <CardDescription>
                Defina as taxas de câmbio utilizadas nos cálculos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure as taxas de câmbio entre Reais (BRL), Dólares (USD) e Guaranis (PYG)
                utilizadas nos cálculos de frete internacional.
              </p>

              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Em desenvolvimento</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        A configuração de taxas de câmbio estará disponível em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preços de Referência</CardTitle>
              <CardDescription>
                Configure preços de referência para produtos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Defina os preços de referência para diversos produtos que são frequentemente
                transportados entre Brasil e Paraguai.
              </p>

              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Em desenvolvimento</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        A configuração de preços de referência estará disponível em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;