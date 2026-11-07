/**
 * 📡 RÈGLE ABSOLUE « l'appli s'ouvre toujours, même sans réseau » (2026-11-07, modèle Agenda/Dinislam).
 * Petits outils de connexion hors ligne, partagés entre useAuth et ProtectedRoute.
 */
import type { Session } from "@supabase/supabase-js";
import { AUTH_STORAGE_KEY } from "@/integrations/supabase/client";

/** Session encore enregistrée sur l'appareil (Supabase ne l'efface que sur une vraie déconnexion ou un jeton refusé). */
export function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const s = parsed?.currentSession ?? parsed;
    return s?.user?.id ? (s as Session) : null;
  } catch {
    return null;
  }
}

/**
 * Statut du compte (validé par l'admin ou non) de la dernière vérification réussie, gardé sur l'appareil :
 * sans réseau, l'appli s'ouvre tout de suite avec lui (jamais de faux « Inscription en attente »).
 * Le rôle élève/parent vient de la session elle-même (user_metadata.status) et l'admin de son e-mail :
 * ils sont donc déjà connus hors ligne.
 */
type AuthCache = { isApproved?: boolean };
const authCacheKey = (userId: string) => `pausetude_auth_cache_${userId}`;

export function readApprovalCache(userId: string): boolean | null {
  try {
    const c = JSON.parse(localStorage.getItem(authCacheKey(userId)) || "null") as AuthCache | null;
    return typeof c?.isApproved === "boolean" ? c.isApproved : null;
  } catch {
    return null;
  }
}

export function writeApprovalCache(userId: string, isApproved: boolean) {
  try {
    localStorage.setItem(authCacheKey(userId), JSON.stringify({ isApproved }));
  } catch { /* stockage plein ou bloqué */ }
}

/** Dit au service worker qui est connecté (secours des données hors ligne si le jeton a expiré). */
export function tellServiceWorker(userId: string) {
  try {
    navigator.serviceWorker?.ready.then((reg) => reg.active?.postMessage({ type: "CURRENT_USER", id: userId })).catch(() => {});
  } catch { /* navigateur sans service worker */ }
}
