import { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  steps: { id: number; label: string; icon?: ReactNode }[];
  onStepClick: (step: number) => void;
}

const StepIndicator: FC<StepIndicatorProps> = ({ currentStep, steps, onStepClick }) => {
  return (
    <div className="flex flex-wrap sm:flex-nowrap border-b border-neutral-200 dark:border-neutral-700 bg-muted/30">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isClickable = currentStep >= step.id;
        
        return (
          <button
            key={step.id}
            className={cn(
              "flex flex-1 items-center py-4 px-4 text-sm transition-all duration-200 relative",
              isActive && "bg-primary/5 dark:bg-primary/10",
              isCompleted ? "text-primary font-medium" : 
                isActive ? "text-primary font-medium" : 
                "text-muted-foreground",
              isClickable ? "hover:bg-primary/5 cursor-pointer" : "cursor-not-allowed opacity-70"
            )}
            onClick={() => isClickable && onStepClick(step.id)}
            disabled={!isClickable}
            aria-current={isActive ? "step" : undefined}
          >
            {/* Conectores entre etapas */}
            {index > 0 && (
              <div className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-border dark:bg-muted" />
            )}
            
            {/* Indicador numerado ou ícone */}
            <span
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm mr-3 shadow-sm transition-all duration-300 shrink-0",
                isCompleted 
                  ? "bg-primary text-primary-foreground" 
                  : isActive
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground border border-border"
              )}
            >
              {isCompleted ? (
                <CheckIcon className="h-4 w-4" />
              ) : step.icon || step.id}
            </span>
            
            {/* Texto da etapa */}
            <div className="flex flex-col items-start">
              <span className={cn(
                "text-sm font-medium transition-colors",
                isActive && "text-primary"
              )}>
                {step.label}
              </span>
              
              {/* Barra de progresso somente para etapa ativa */}
              {isActive && (
                <span className="mt-1 block h-0.5 w-1/2 bg-primary animate-pulse rounded-full" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default StepIndicator;
