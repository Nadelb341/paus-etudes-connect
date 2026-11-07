import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

/**
 * 📡 Mode hors ligne (règle « l'appli s'ouvre toujours, même sans réseau », 2026-11-07, modèle Dinislam) :
 * après chaque construction, écrit dans dist/sw.js la liste de TOUS les fichiers de l'appli à garder en mémoire
 * dès l'installation (scripts, styles, polices, icônes) + un numéro de version.
 */
const offlinePrecache = () => {
  let outDir = "dist";
  return {
    name: "pausetude-offline-precache",
    apply: "build" as const,
    configResolved(c: { root: string; build: { outDir: string } }) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const swPath = path.join(outDir, "sw.js");
      if (!fs.existsSync(swPath)) return;
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of fs.readdirSync(dir)) {
          const full = path.join(dir, f);
          if (fs.statSync(full).isDirectory()) walk(full);
          else files.push("/" + path.relative(outDir, full).split(path.sep).join("/"));
        }
      };
      walk(outDir);
      const skip = /(^\/sw\.js$|\.map$|\.woff$|^\/robots\.txt$|^\/placeholder\.svg$)/;
      const list = files.filter((f) => !skip.test(f)).map((f) => (f === "/index.html" ? "/" : f)).sort();
      const version = (process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "") + Date.now().toString(36);
      const sw = fs.readFileSync(swPath, "utf8").replace("__BUILD_VERSION__", version);
      fs.writeFileSync(swPath, `self.__PRECACHE = ${JSON.stringify(list)};\n` + sw);
      const size = list.reduce((t, f) => t + fs.statSync(path.join(outDir, f === "/" ? "index.html" : f.slice(1))).size, 0);
      console.log(`[offline-precache] ${list.length} fichiers gardés en mémoire hors ligne (${(size / 1048576).toFixed(1)} Mo, version ${version})`);
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), offlinePrecache()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
