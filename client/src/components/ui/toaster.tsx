import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  BellRing 
} from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Escolha o ícone com base na variante
        const IconComponent = variant === "destructive" 
          ? AlertCircle 
          : variant === "success" 
          ? CheckCircle2 
          : variant === "warning" 
          ? AlertTriangle 
          : variant === "info" 
          ? Info 
          : BellRing;
          
        // Classe baseada na variante
        const iconClass = variant === "destructive" 
          ? "text-destructive-foreground" 
          : variant === "success" 
          ? "text-success-foreground" 
          : variant === "warning" 
          ? "text-warning-foreground" 
          : variant === "info" 
          ? "text-info-foreground" 
          : "text-primary";
        
        return (
          <Toast key={id} variant={variant} {...props} className="group animate-fade-in-fast">
            <div className="flex flex-row gap-3">
              <div className="h-5 w-5 shrink-0 mt-1 animate-pulse">
                <IconComponent className={`h-5 w-5 ${iconClass}`} />
              </div>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
