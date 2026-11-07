import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// 📡 Polices incluses dans l'appli : aucune dépendance à Internet pour s'afficher (2026-11-07).
// ⚡ Seules les graisses réellement utilisées (normal, medium, semibold) et l'alphabet latin.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./index.css";

// Service worker : notifications push + mode hors ligne (l'appli s'ouvre même sans réseau).
// En développement, il est retiré (sinon il garderait d'anciens fichiers en mémoire pendant qu'on code).
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(err => console.log("SW registration failed:", err));
  } else {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => ("caches" in window ? caches.keys() : Promise.resolve([] as string[])))
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("pausetude-")).map((k) => caches.delete(k))))
      .catch(() => {});
  }
}

// Effacer le badge quand l'app est au premier plan
if ("clearAppBadge" in navigator) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") (navigator as any).clearAppBadge();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
