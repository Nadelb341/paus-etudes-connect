import React from "react";

/**
 * 🛟 Filet d'erreur (règle « l'appli s'ouvre toujours », 2026-11-07) : la moindre erreur d'affichage ne donne
 * plus jamais un écran vide.
 * - scope « app » (par défaut) : autour de toute l'appli, message plein écran ;
 * - scope « page » : autour de chaque page, le reste de l'appli reste utilisable.
 */
interface Props {
  children: React.ReactNode;
  scope?: "app" | "page";
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("Erreur d'affichage attrapée :", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const isPage = this.props.scope === "page";
    return (
      <div className={`${isPage ? "py-16" : "min-h-screen"} flex items-center justify-center bg-background px-4 text-center`}>
        <div className="max-w-md space-y-3">
          <div className="text-5xl">😕</div>
          <p className="text-lg font-heading font-bold text-foreground">
            {isPage ? "Cette page n'a pas pu s'afficher." : "L'appli a rencontré un souci d'affichage."}
          </p>
          <p className="text-sm text-muted-foreground">
            {isPage ? "Le reste de l'appli marche toujours : réessayez, ou revenez à l'accueil." : "Vos données ne sont pas perdues. Rechargez l'appli pour continuer."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => (isPage ? this.setState({ hasError: false }) : window.location.reload())}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              {isPage ? "Réessayer" : "Recharger"}
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/"; }}
              className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary"
            >
              Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
