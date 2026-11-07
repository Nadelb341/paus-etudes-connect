// 📡 Copie de l'Agenda/Dinislam (2026-11-07) : vraie connexion vérifiée + dernière connexion réussie, pour le bandeau « Hors connexion ».
import { useEffect, useRef, useState } from "react";

const LAST_ONLINE_KEY = "pausetude_last_online_at";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const PROBE_TIMEOUT_MS = 5000;
const PROBE_INTERVAL_MS = 15000;

function readLastOnline(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ONLINE_KEY);
    return raw ? Number(raw) : null;
  } catch { return null; }
}

// `navigator.onLine` dit seulement si le wifi/le réseau mobile est allumé, pas si Internet répond vraiment
// (un wifi « connecté mais sans Internet » reste « en ligne »). Seule une vraie requête limitée dans le temps
// le dit. Elle vise la connexion Supabase (`/auth/v1/health`) : autre adresse que l'appli, que le service worker
// laisse passer sans jamais répondre à sa place (sinon la mémoire fausserait le résultat).
async function probeConnectivity(): Promise<boolean> {
  if (!SUPABASE_URL) return navigator.onLine;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/health`, { method: "GET", mode: "no-cors", signal: controller.signal, cache: "no-store" });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Toujours la dernière connexion RÉELLEMENT vérifiée
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(() => readLastOnline());
  const probingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const markOnline = () => {
      const now = Date.now();
      try { localStorage.setItem(LAST_ONLINE_KEY, String(now)); } catch { /* stockage bloqué */ }
      setLastOnlineAt(now);
      setIsOnline(true);
    };
    const markOffline = () => setIsOnline(false);

    const runProbe = async () => {
      if (probingRef.current) return;
      probingRef.current = true;
      const ok = await probeConnectivity();
      probingRef.current = false;
      if (!mounted) return;
      if (ok) markOnline();
      else markOffline();
    };

    // « offline » du navigateur = sûrement hors ligne ; « online » = à vérifier par une vraie requête
    const goOnline = () => { runProbe(); };
    const goOffline = () => markOffline();

    if (navigator.onLine) runProbe(); else markOffline();

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    // Sonde répétée : seul moyen de voir une perte ou un retour d'Internet quand `navigator.onLine` ne change pas
    const interval = setInterval(runProbe, PROBE_INTERVAL_MS);

    return () => {
      mounted = false;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, lastOnlineAt };
}
