import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  show: boolean;
  onClick: () => void;
  // "absolute" pour les dialogs, "fixed" pour les pages entières
  position?: "absolute" | "fixed";
  className?: string;
}

const ScrollToTopButton = ({ show, onClick, position = "absolute", className }: ScrollToTopButtonProps) => {
  if (!show) return null;

  return (
    <button
      onClick={onClick}
      title="Retour en haut"
      className={cn(
        position === "fixed" ? "fixed" : "absolute",
        "bottom-4 right-4 z-50",
        "bg-primary text-primary-foreground rounded-full w-10 h-10",
        "flex items-center justify-center shadow-lg",
        "hover:bg-primary/90 transition-all",
        className
      )}
    >
      <ChevronUp size={20} />
    </button>
  );
};

export default ScrollToTopButton;
