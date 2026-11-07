import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * 📡 Bandeau « Hors connexion » (règle « l'appli s'ouvre toujours, même sans réseau », 2026-11-07).
 * Dit que ce qui est affiché est la dernière version enregistrée, et depuis quand (vraie dernière connexion réussie).
 */
const pad = (n: number) => String(n).padStart(2, "0");

function lastConnectionText(at: number | null): string {
  if (!at) return "";
  const d = new Date(at);
  const today = new Date().toDateString() === d.toDateString();
  const day = today ? "aujourd'hui" : `le ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  // Espaces insécables : « 20 h 10 » ne se coupe jamais en deux lignes
  return ` — dernière connexion ${day} à\u00a0${pad(d.getHours())}\u00a0h\u00a0${pad(d.getMinutes())}`;
}

export default function OfflineBanner({ variant = "bar" }: { variant?: "bar" | "card" }) {
  const { isOnline, lastOnlineAt } = useOnlineStatus();
  if (isOnline) return null;
  if (variant === "card") {
    // Écran de connexion : il faut Internet pour se connecter la première fois sur un appareil
    return (
      <div role="status" className="mb-4 w-full max-w-md rounded-lg border-2 border-amber-400 bg-amber-100 px-3 py-2 text-sm text-amber-900">
        📡 <b>Hors connexion{lastConnectionText(lastOnlineAt)}.</b> Pour vous connecter la première fois sur cet appareil, il faut Internet. Ensuite, l'appli s'ouvrira toujours, même sans réseau.
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center justify-center gap-2 border-t border-amber-400 bg-amber-100 px-3 py-1.5 text-center">
      <WifiOff className="h-4 w-4 shrink-0 text-amber-800" />
      <span className="min-w-0 text-xs font-medium text-amber-900">
        Hors connexion{lastConnectionText(lastOnlineAt)} · vos dernières données sont affichées, les envois reprendront au retour du réseau
      </span>
    </div>
  );
}
