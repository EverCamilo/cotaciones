import { useState, useEffect } from "react";
import { useFreight } from "../../contexts/FreightContext";
import StepIndicator from "./StepIndicator";
import BasicInfoForm from "./BasicInfoForm";
import DetailedInfoForm from "./DetailedInfoForm";
import ResultsView from "./ResultsView";
import { TruckIcon, PackageIcon, BarChart3Icon, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";

const steps = [
  { id: 1, label: "Informações Básicas", icon: <TruckIcon className="h-4 w-4" /> },
  { id: 2, label: "Detalhes da Carga", icon: <PackageIcon className="h-4 w-4" /> },
  { id: 3, label: "Resultados", icon: <BarChart3Icon className="h-4 w-4" /> }
];

interface CalculatorFormProps {
  resetFreightQuote?: () => void;
}

const CalculatorForm = ({ resetFreightQuote }: CalculatorFormProps) => {
  const { currentStep, setCurrentStep } = useFreight();
  const [animationClass, setAnimationClass] = useState("animate-fade-in");

  // Atualiza a animação quando o passo mudar
  useEffect(() => {
    setAnimationClass(""); // Remove a animação
    // Adiciona a classe após um pequeno delay para permitir que o DOM seja atualizado
    const timer = setTimeout(() => {
      setAnimationClass("animate-fade-in");
    }, 10);
    
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleStepClick = (step: number) => {
    // Only allow navigating to previous steps or the current step
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoForm />;
      case 2:
        return <DetailedInfoForm />;
      case 3:
        return <ResultsView />;
      default:
        return <BasicInfoForm />;
    }
  };

  return (
    <div className="calculator-container mx-auto w-full h-full flex-1 flex flex-col">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden hover-glow transition-all duration-300 flex-1 flex flex-col h-full">
        {/* Título do formulário */}
        <div className="bg-gradient-to-r from-primary/10 to-transparent dark:from-primary/20 dark:to-transparent p-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">Calculadora de Frete Internacional</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Calcule custos precisos para transporte entre Paraguai e Brasil
              </p>
            </div>
            {resetFreightQuote && (
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={resetFreightQuote}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Limpar</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Form steps indicator */}
        <StepIndicator 
          currentStep={currentStep} 
          steps={steps} 
          onStepClick={handleStepClick} 
        />
        
        {/* Form content - flex-1 para ocupar todo o espaço disponível */}
        <div className={`p-6 ${animationClass} flex-1 overflow-y-auto`}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default CalculatorForm;
