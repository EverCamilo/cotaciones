import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, LineChart, PieChart, Presentation, FileText } from "lucide-react";
import { useState } from "react";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Visualize relatórios e estatísticas sobre cálculos de frete e operações.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid grid-cols-2 md:grid-cols-5 h-auto p-1">
          <TabsTrigger value="general" className="flex items-center gap-2 py-2">
            <Presentation className="h-4 w-4" />
            <span className="hidden md:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2 py-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden md:inline">Rotas</span>
          </TabsTrigger>
          <TabsTrigger value="aduanas" className="flex items-center gap-2 py-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden md:inline">Aduanas</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2 py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">Custos</span>
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2 py-2">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Exportar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral</CardTitle>
              <CardDescription>
                Resumo dos cálculos e operações de frete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Visualize estatísticas gerais sobre as operações de frete realizadas
                no sistema, incluindo totais, médias e tendências.
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
                        Os relatórios gerais estarão disponíveis em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Rotas</CardTitle>
              <CardDescription>
                Estatísticas sobre as rotas mais utilizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Analise as rotas mais frequentes, distâncias médias e outras informações
                relevantes sobre os trajetos calculados no sistema.
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
                        Os relatórios de rotas estarão disponíveis em breve.
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
              <CardTitle>Relatório de Aduanas</CardTitle>
              <CardDescription>
                Análise comparativa entre aduanas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Visualize estatísticas sobre quais aduanas são mais utilizadas em suas
                cotações, incluindo custos médios, tempos de processamento e economia.
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
                        Os relatórios de aduanas estarão disponíveis em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Custos</CardTitle>
              <CardDescription>
                Análise detalhada de custos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Examine o breakdown detalhado dos diversos componentes de custo em suas
                cotações de frete internacional, incluindo taxas, combustível e distância.
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
                        Os relatórios de custos estarão disponíveis em breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Dados</CardTitle>
              <CardDescription>
                Exporte relatórios em diferentes formatos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Exporte seus dados e relatórios em diversos formatos como PDF, Excel
                ou CSV para análise externa ou arquivamento.
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
                        A funcionalidade de exportação estará disponível em breve.
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

export default Reports;