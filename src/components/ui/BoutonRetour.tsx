import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// « ← Retour » commun à toutes les pages (règle de Nadia du 2026-11-05).
// Revient à la page précédente si on vient de l'appli, sinon à la page parente
// (`repli`) : jamais un bouton qui ne fait rien ou qui sort de l'appli.
type Props = {
  libelle?: string;
  repli?: string;
  onClick?: () => void;
};

export const BoutonRetour = ({ libelle = "Retour", repli = "/", onClick }: Props) => {
  const navigate = useNavigate();
  const retour = () => {
    if (onClick) return onClick();
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(repli, { replace: true });
  };
  return (
    <button
      type="button"
      onClick={retour}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 transition-colors shrink-0"
    >
      <ArrowLeft size={16} className="shrink-0" />
      <span>{libelle}</span>
    </button>
  );
};

export default BoutonRetour;
