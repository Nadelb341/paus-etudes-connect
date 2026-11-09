import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("Page introuvable :", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-heading font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">Oups ! Cette page n'existe pas.</p>
        <BoutonRetour libelle="Retour à l'accueil" repli="/" onClick={() => window.location.assign("/")} />
      </div>
    </div>
  );
};

export default NotFound;
