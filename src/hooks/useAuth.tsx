import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { ADMIN_EMAIL } from "@/lib/constants";
import { readStoredSession, readApprovalCache, tellServiceWorker } from "@/lib/offlineAuth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

/**
 * 📡 Ouverture immédiate (2026-11-07, modèle Agenda/Dinislam) : un compte déjà vérifié sur cet appareil
 * (admin, ou statut mémorisé) ouvre l'appli tout de suite avec la session enregistrée ; la vraie vérification
 * suit derrière (session refusée par le serveur → retour à la connexion, comme avant).
 */
function bootSession(): Session | null {
  const known = readStoredSession();
  if (!known) return null;
  const isAdmin = known.user.email === ADMIN_EMAIL;
  return isAdmin || readApprovalCache(known.user.id) !== null ? known : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(bootSession);
  const [user, setUser] = useState<User | null>(boot?.user ?? null);
  const [session, setSession] = useState<Session | null>(boot);
  const [loading, setLoading] = useState(!boot);

  useEffect(() => {
    let mounted = true;
    let sessionKnown = false;

    // Filet : sans réseau (wifi sans Internet), la session peut tarder plusieurs secondes.
    // Au bout de 2 s, on ouvre avec celle enregistrée sur l'appareil au lieu de rester sur « Chargement… ».
    const safetyTimer = setTimeout(() => {
      if (!mounted || sessionKnown) return;
      const stored = readStoredSession();
      if (stored) {
        setSession(stored);
        setUser(stored.user);
      }
      setLoading(false);
    }, 2000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        sessionKnown = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      sessionKnown = true;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      // Erreur inattendue : on garde la session enregistrée plutôt que de bloquer l'ouverture
      const stored = readStoredSession();
      if (stored) { setSession(stored); setUser(stored.user); }
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => { if (user?.id) tellServiceWorker(user.id); }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
