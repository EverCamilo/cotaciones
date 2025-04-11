import CalculatorForm from "../components/calculator/CalculatorForm";
import { useFreight } from "../contexts/FreightContext";

export default function Home() {
  const { resetFreightQuote } = useFreight();

  const handleReset = () => {
    resetFreightQuote();
  };

  return (
    <div className="flex flex-col h-full w-full flex-1">
      {/* Calculator form com h-full para ocupar todo o espaço disponível */}
      <div className="flex-1 flex w-full h-full px-0">
        {/* Removida restrição de largura para ocupar todo o espaço disponível */}
        <CalculatorForm resetFreightQuote={resetFreightQuote} />
      </div>
    </div>
  );
}
