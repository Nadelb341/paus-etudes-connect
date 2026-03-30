import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Enregistrement du Service Worker pour les notifications push
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(err => console.log("SW registration failed:", err));
}

// Effacer le badge quand l'app est au premier plan
if ("clearAppBadge" in navigator) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") (navigator as any).clearAppBadge();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
