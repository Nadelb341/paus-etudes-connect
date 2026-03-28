import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL } from "@/lib/constants";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [approved, setApproved] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    if (!user) { setCheckingApproval(false); return; }
    // Admin is always approved
    if (user.email === ADMIN_EMAIL) {
      setApproved(true);
      setCheckingApproval(false);
      return;
    }
    const checkApproval = async () => {
      const { data } = await supabase.from("profiles").select("is_approved").eq("user_id", user.id).maybeSingle();
      setApproved(data?.is_approved ?? false);
      setCheckingApproval(false);
    };
    checkApproval();
  }, [user]);

  if (loading || checkingApproval) {
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
