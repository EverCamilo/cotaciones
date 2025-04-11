import { useState, useEffect } from "react";
import { useFreight } from "../../contexts/FreightContext";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getBrazilianAduanas } from "../../utils/aduanaHelper";
import { ChevronLeft, ChevronRight, CalculatorIcon } from "lucide-react";

const DetailedInfoForm = () => {
  const { freightQuote, updateFreightQuote, setCurrentStep, calculateFreight, isCalculating, error } = useFreight();
  
  // Por padrão, usamos "auto" para permitir a recomendação automática
  const [selectedAduana, setSelectedAduana] = useState<string>(freightQuote.recommendedAduana || "auto");
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);
  const [specialHandling, setSpecialHandling] = useState<boolean>(false);
  const [customsProcess, setCustomsProcess] = useState<string>("normal");
  // Por padrão, a empresa não paga a balsa
  const [companyPaysBalsa, setCompanyPaysBalsa] = useState<boolean>(false);
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  
  const aduanas = getBrazilianAduanas();

  useEffect(() => {
    // Sempre inicializar com automático (não deve ter nenhuma preferência por padrão)
    let initialAduana = "auto";
    
    // Se o usuário explicitamente escolheu uma aduana, então respeitamos
    if (freightQuote.customsDetails?.preferredAduana && freightQuote.customsDetails.preferredAduana !== "auto") {
      console.log(`Recuperando aduana preferencial previamente selecionada: ${freightQuote.customsDetails.preferredAduana}`);
      initialAduana = freightQuote.customsDetails.preferredAduana;
    }
    
    setSelectedAduana(initialAduana);
    
    // Se já temos detalhes da alfândega, recuperar as configurações salvas
    if (freightQuote.customsDetails) {
      // Configurações binárias (checkboxes)
      if (freightQuote.customsDetails.companyPaysBalsa !== undefined) {
        console.log(`Restaurando configuração de pagamento da balsa: ${freightQuote.customsDetails.companyPaysBalsa ? 'SIM' : 'NÃO'}`);
        setCompanyPaysBalsa(freightQuote.customsDetails.companyPaysBalsa);
      }
      if (freightQuote.customsDetails.includeInsurance !== undefined) {
        setIncludeInsurance(freightQuote.customsDetails.includeInsurance);
      }
      if (freightQuote.customsDetails.specialHandling !== undefined) {
        setSpecialHandling(freightQuote.customsDetails.specialHandling);
      }
      
      // Configurações de seleção (radio buttons, select)
      if (freightQuote.customsDetails.customsProcess) {
        setCustomsProcess(freightQuote.customsDetails.customsProcess);
      }
      
      // Campos de texto
      if (freightQuote.customsDetails.additionalNotes) {
        setAdditionalNotes(freightQuote.customsDetails.additionalNotes);
      }
    }
    
    // Log completo das configurações atuais
    console.log("Estado atual do formulário:", {
      selectedAduana,
      companyPaysBalsa,
      includeInsurance,
      specialHandling,
      customsProcess
    });
  }, [freightQuote.recommendedAduana, freightQuote.customsDetails]);

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  // SOLUÇÃO DEFINITIVA: Vamos atualizar DIRETAMENTE o objeto global freightQuote
  // para garantir que as configurações não sejam perdidas

  // Esta função substitui todos os deltas complicados por uma abordagem direta
  const handleCalculate = () => {
    console.log(`🔥 SOLUÇÃO FINAL - MÉTODO DIRETO 🔥`);
    console.log(`Aduana selecionada: ${selectedAduana}`);
    console.log(`Empresa paga balsa: ${companyPaysBalsa ? "SIM" : "NÃO"}`);
    
    // ETAPA 1: Definir os valores que queremos que cheguem ao servidor
    // Variáveis locais para GARANTIR que os valores sejam capturados corretamente
    const forceAduana = selectedAduana !== "auto";
    const selectedAduanaValue = forceAduana ? selectedAduana : undefined;
    const forceBalsaPayment = companyPaysBalsa;
    
    console.log(`⚡ CONFIGURAÇÕES QUE DEVEM SER RESPEITADAS:`);
    console.log(`⚡ forceAduana: ${forceAduana}`);
    console.log(`⚡ selectedAduanaValue: ${selectedAduanaValue || '(automático)'}`);
    console.log(`⚡ forceBalsaPayment: ${forceBalsaPayment}`);
    
    // ETAPA 2: Criar um método direto de capturar esses valores no momento de uso
    // Definimos uma função global que será usada pelo calculateFreight
    
    // Criamos um objeto no escopo global (window) para armazenar os valores
    // que devem ser respeitados pelo sistema
    (window as any).__CRITICAL_VALUES__ = {
      forceAduana,
      selectedAduana: selectedAduanaValue,
      forceBalsaPayment
    };
    
    console.log(`🔒 VALORES CRÍTICOS ARMAZENADOS GLOBALMENTE:`);
    console.log((window as any).__CRITICAL_VALUES__);
    
    // ETAPA 3: Atualizar o contexto do FreightQuote
    // Se selecionou automático, NÃO armazenar preferredAduana
    const updatedCustomsDetails = {
      // Só salvamos preferência de aduana se NÃO for automático
      ...(selectedAduana !== "auto" && { preferredAduana: selectedAduana }),
      includeInsurance,
      specialHandling,
      customsProcess,
      companyPaysBalsa,
      additionalNotes: additionalNotes || undefined
    };
    
    // Atualizar o estado
    updateFreightQuote({
      customsDetails: updatedCustomsDetails,
      _forceAduana: forceAduana,
      _selectedAduana: selectedAduanaValue,
      _forceBalsaPayment: forceBalsaPayment
    });
    
    // ETAPA 4: Iniciar o cálculo após um pequeno delay
    setTimeout(() => {
      // Verificação final antes de calcular
      console.log(`✅ VALORES CRÍTICOS ANTES DO CÁLCULO:`);
      console.log((window as any).__CRITICAL_VALUES__);
      
      // Chamar o cálculo de frete
      calculateFreight();
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 font-medium text-neutral-800 dark:text-white">
          Aduana Preferencial
        </Label>
        <Select 
          value={selectedAduana} 
          onValueChange={(value) => {
            console.log(`Usuário selecionou aduana: ${value}`);
            setSelectedAduana(value);
          }}
        >
          <SelectTrigger className="border-2 border-primary-500">
            <SelectValue placeholder="Selecione uma aduana específica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automático (recomendado)</SelectItem>
            {aduanas.map((aduana) => (
              <SelectItem key={aduana} value={aduana}>
                {aduana}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-bold">IMPORTANTE:</span> Selecione "Automático" para permitir que o sistema calcule a melhor aduana ou escolha uma aduana específica que será usada nos cálculos
        </p>
      </div>

      <div className="flex flex-col space-y-3">
        <Label className="font-medium text-neutral-800 dark:text-white">
          Opções Adicionais
        </Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="insurance" 
            checked={includeInsurance}
            onCheckedChange={(checked) => setIncludeInsurance(checked as boolean)}
          />
          <Label htmlFor="insurance" className="text-sm font-normal">
            Incluir seguro da mercadoria (0.14% do valor declarado)
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="companyPaysBalsa" 
            checked={companyPaysBalsa}
            onCheckedChange={(checked) => {
              console.log(`🔍 Alterando "Empresa paga balsa" para: ${checked}`);
              setCompanyPaysBalsa(checked as boolean);
            }}
          />
          <div>
            <Label htmlFor="companyPaysBalsa" className="text-sm font-normal">
              Empresa paga balsa (aplica-se apenas à aduana de Guaíra)
            </Label>
            <p className="mt-1 ml-6 text-xs text-neutral-500 dark:text-neutral-400">
              Esta opção influencia apenas a rota de Guaíra. Para Santa Helena, a balsa é sempre paga pela empresa independente desta seleção.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="specialHandling" 
            checked={specialHandling}
            onCheckedChange={(checked) => setSpecialHandling(checked as boolean)}
          />
          <Label htmlFor="specialHandling" className="text-sm font-normal">
            Carga requer manuseio especial
          </Label>
        </div>
      </div>

      <div>
        <Label className="mb-2 font-medium text-neutral-800 dark:text-white">
          Processo Aduaneiro
        </Label>
        <RadioGroup 
          value={customsProcess} 
          onValueChange={setCustomsProcess}
          className="flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="normal" />
            <Label htmlFor="normal" className="text-sm font-normal">Normal (7-10 dias)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="expedited" id="expedited" />
            <Label htmlFor="expedited" className="text-sm font-normal">Acelerado (3-5 dias, +15%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="priority" id="priority" />
            <Label htmlFor="priority" className="text-sm font-normal">Prioritário (1-2 dias, +30%)</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="additionalNotes" className="mb-2 font-medium text-neutral-800 dark:text-white">
          Observações Adicionais
        </Label>
        <textarea
          id="additionalNotes"
          className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
          placeholder="Informações adicionais relevantes para a cotação..."
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
        ></textarea>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        
        <Button 
          onClick={handleCalculate}
          disabled={isCalculating}
          className="px-5 py-2.5"
        >
          {isCalculating ? (
            <>Calculando...</>
          ) : (
            <>
              Calcular Frete
              <CalculatorIcon className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DetailedInfoForm;
