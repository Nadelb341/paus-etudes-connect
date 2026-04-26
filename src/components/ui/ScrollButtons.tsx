import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollButtonsProps {
  showTop: boolean;
  showBottom: boolean;
  onScrollTop: () => void;
  onScrollBottom: () => void;
  position?: "absolute" | "fixed";
}

export function ScrollButtons({
  showTop,
  showBottom,
  onScrollTop,
  onScrollBottom,
  position = "absolute",
}: ScrollButtonsProps) {
  const base = cn(
    "w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95",
    "bg-primary text-primary-foreground hover:bg-primary/90",
    position === "fixed" ? "fixed right-4 z-50" : "absolute right-4 z-10"
  );

  if (!showTop && !showBottom) return null;

  return (
    <>
      {showTop && (
        <button
          onClick={onScrollTop}
          className={cn(base, position === "fixed" ? "bottom-20" : "bottom-4")}
          aria-label="Retour en haut"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
      {showBottom && (
        <button
          onClick={onScrollBottom}
          className={cn(base, position === "fixed" ? "bottom-20" : "bottom-4")}
          aria-label="Aller en bas"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}
    </>
  );
}

export default ScrollButtons;
