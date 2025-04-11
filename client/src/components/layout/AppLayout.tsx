import { useState, ReactNode, useEffect } from "react";
import Sidebar from "./Sidebar";
import OfflineBanner from "./OfflineBanner";
import { FreightProvider } from "../../contexts/FreightContext";
import { PageTransition } from "@/components/ui/page-transition";
import { useLocation } from "wouter";
import { useRealtimeSyncContext } from "@/contexts/RealtimeSyncContext";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [location] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected, connectionError, connect } = useRealtimeSyncContext();

  // Fechar o sidebar automaticamente após a navegação em dispositivos móveis
  useEffect(() => {
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [location]);
  
  // Simular um estado de carregamento entre as navegações
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [location]);

  // Tentar reconectar quando o usuário retorna ao aplicativo
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!isConnected || connectionError)) {
        // Quando o usuário volta para a aba, tenta reconectar
        console.log('Visibilidade mudou para visível, tentando reconectar...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, connectionError, connect]);

  const toggleSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - visível em telas maiores */}
      <div className="hidden lg:block lg:flex-none">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar - aparece quando toggleSidebar é acionado */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden animate-fade-in-fast">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={toggleSidebar}
            aria-hidden="true"
          ></div>
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-neutral-800 z-50 shadow-xl animate-slide-in-left border-r border-border/30">
            <Sidebar />
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:pl-64">
        {/* Botão do menu móvel flutuante - apenas em dispositivos móveis */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="default"
            size="icon-sm"
            onClick={toggleSidebar}
            className="rounded-full shadow-lg hover:shadow-xl"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-[18px] w-[18px]" />
          </Button>
        </div>
        
        {/* Indicador de carregamento */}
        {isLoading && (
          <div className="h-1 bg-primary/10 relative overflow-hidden z-50">
            <div className="absolute inset-0 bg-primary animate-shimmer"></div>
          </div>
        )}
        
        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar bg-neutral-50 dark:bg-neutral-900 p-2 md:p-3 relative flex flex-col h-full">
          <PageTransition pageKey={location} className="flex-1 flex flex-col h-full">
            {children}
          </PageTransition>
          
          {/* Exibir banner de status offline quando desconectado */}
          <OfflineBanner />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
