import { Menu } from "lucide-react";
import { Button } from "../ui/button";
import ThemeToggle from "../ui/ThemeToggle";
import { useLocation } from "wouter";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const [location] = useLocation();
  
  return (
    <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-40 shadow-sm animate-slide-in-top">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Logo e Toggle do Sidebar */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className="mr-2 btn lg:hidden hover-scale"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-[18px] w-[18px] text-primary" />
          </Button>
          
          <h1 className="text-xl font-heading font-bold bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
            <span className="animate-fade-in">Trans Fenix</span>
          </h1>
        </div>
        
        {/* Toggle de tema - único elemento mantido */}
        <ThemeToggle className="btn hover-glow" />
      </div>
    </header>
  );
};

export default Header;