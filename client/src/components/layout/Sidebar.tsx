import { Link, useLocation } from "wouter";
import { Truck, BarChart2, History, Settings, Brain, Database } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import logoImage from "../../assets/images/logo.png";

const Sidebar = () => {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col bg-white dark:bg-neutral-800 border-r border-neutral-100 dark:border-neutral-700 shadow-sm z-10">
      <div className="py-3 px-4 border-b border-neutral-100 dark:border-neutral-700">
        <div>
          <h1 className="text-base font-heading font-bold text-primary-600 dark:text-primary-400">Trans Fenix</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Calculadora de Frete Internacional</p>
        </div>
      </div>
      
      <nav className="flex-1 flex flex-col">
        <div className="space-y-0.5 px-2 pt-2">
          <Link href="/" className={`flex items-center py-2 px-3 rounded-md transition-colors duration-150 ${
              isActive("/") 
              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 font-medium" 
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            }`}>
              <Truck className="h-4 w-4 mr-3 text-current" />
              <span className="text-sm">Calculadora</span>
          </Link>
          
          <Link href="/history" className={`flex items-center py-2 px-3 rounded-md transition-colors duration-150 ${
              isActive("/history") 
              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 font-medium" 
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            }`}>
              <History className="h-4 w-4 mr-3 text-current" />
              <span className="text-sm">Histórico</span>
          </Link>
          
          <Link href="/reports" className={`flex items-center py-2 px-3 rounded-md transition-colors duration-150 ${
              isActive("/reports") 
              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 font-medium" 
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            }`}>
            <BarChart2 className="h-4 w-4 mr-3 text-current" />
            <span className="text-sm">Relatórios</span>
          </Link>
          
          <Link href="/settings" className={`flex items-center py-2 px-3 rounded-md transition-colors duration-150 ${
              isActive("/settings") 
              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 font-medium" 
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            }`}>
            <Settings className="h-4 w-4 mr-3" />
            <span className="text-sm">Configurações</span>
          </Link>
          
          <Link href="/admin" className={`flex items-center py-2 px-3 rounded-md transition-colors duration-150 ${
              isActive("/admin") 
              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 font-medium" 
              : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            }`}>
            <Database className="h-4 w-4 mr-3" />
            <span className="text-sm">Administração</span>
          </Link>
        </div>
        
        {/* Logo da empresa centralizado verticalmente */}
        <div className="flex-grow flex items-center justify-center">
          <img 
            src={logoImage} 
            alt="Trans Fenix Logo" 
            className="w-24 h-auto object-contain mx-auto"
          />
        </div>
      </nav>
      
      <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-700">
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mr-2 text-xs">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">EC</span>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-medium text-neutral-800 dark:text-neutral-200">Everson Camilo</h4>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Administrador</p>
          </div>
          <ThemeToggle className="hover-glow" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
