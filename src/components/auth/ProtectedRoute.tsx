import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL } from "@/lib/constants";
import { readApprovalCache, writeApprovalCache } from "@/lib/offlineAuth";

/**
 * 📡 Hors ligne (2026-11-07) : le statut « compte validé » de la dernière vérification réussie est gardé sur
 * l'appareil. Sans réseau, on ouvre tout de suite avec lui : jamais de faux « Inscription en attente ».
 * Une vraie réponse de la base (validé / pas validé) remplace toujours la mémoire.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  // Réponse de la base, rattachée à la personne vérifiée (évite d'afficher le statut d'un autre compte après un changement de compte)
  const [checked, setChecked] = useState<{ userId: string; approved: boolean } | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const userId = user?.id;
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!userId || isAdmin) return;
    let cancelled = false;
    const checkApproval = async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("is_approved").eq("user_id", userId).maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        const approved = data?.is_approved ?? false;
        writeApprovalCache(userId, approved);
        setChecked({ userId, approved });
        setFailedFor(null);
      } catch {
        // Réseau absent : on garde la mémoire de l'appareil (rien n'est changé)
        if (!cancelled) setFailedFor(userId);
      }
    };
    checkApproval();
    return () => { cancelled = true; };
  }, [userId, isAdmin, retry]);

  // Retour du réseau : on revérifie tout seul
  useEffect(() => {
    const onOnline = () => setRetry((n) => n + 1);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admin toujours validé ; sinon dernière réponse de la base, sinon la mémoire de l'appareil
  const approved: boolean | null = isAdmin
    ? true
    : checked?.userId === user.id
      ? checked.approved
      : readApprovalCache(user.id);

  if (approved === null) {
    // Jamais vérifié sur cet appareil ET pas de réseau : on le dit clairement (pas de faux « en attente »)
    if (failedFor === user.id) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="bg-card rounded-lg border border-border shadow-card p-8 max-w-md text-center space-y-4">
            <div className="text-4xl">📡</div>
            <h1 className="text-xl font-heading font-bold text-foreground">Pas de connexion</h1>
            <p className="text-sm text-muted-foreground">
              Votre compte n'a pas encore pu être vérifié sur cet appareil. Réessayez dès que vous avez Internet : ensuite, l'appli s'ouvrira toujours, même sans réseau.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setRetry((n) => n + 1)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Réessayer
              </button>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="text-sm text-primary hover:underline px-2"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!approved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card rounded-lg border border-border shadow-card p-8 max-w-md text-center space-y-4">
          <div className="text-4xl">⏳</div>
          <h1 className="text-xl font-heading font-bold text-foreground">Inscription en attente</h1>
          <p className="text-sm text-muted-foreground">
            Votre inscription est en cours de validation par l'administrateur. Vous recevrez un accès dès que votre compte sera approuvé.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-primary hover:underline"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
