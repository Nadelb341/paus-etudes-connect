import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { SUBJECTS_EXTRA, SUBJECTS_GENERAL, SUBJECTS_LYCEE } from "@/lib/constants";

type Subject = typeof SUBJECTS_GENERAL[0];

interface Hit {
  kind: "theme" | "chapter" | "exercise" | "defi" | "document";
  item_id: string;
  item_title: string;
  chapter_id: string | null;
  chapter_title: string | null;
  theme_id: string | null;
  theme_title: string | null;
  subject_id: string;
}

export interface LibraryTarget {
  subject: Subject;
  level: string;
  themeId: string | null; // "none" = chapitres sans thème
  chapterId: string | null;
}

const KIND: Record<Hit["kind"], { icon: string; label: string }> = {
  theme: { icon: "🗂️", label: "Thème" },
  chapter: { icon: "📂", label: "Chapitre" },
  exercise: { icon: "✏️", label: "Exercice" },
  defi: { icon: "🏆", label: "Défi" },
  document: { icon: "📄", label: "Document" },
};

const ALL_SUBJECTS: Subject[] = [...SUBJECTS_GENERAL, ...SUBJECTS_LYCEE, ...SUBJECTS_EXTRA];

/** Recherche (admin) dans les titres de thèmes, chapitres, exercices, défis et documents — insensible aux accents. */
const LibrarySearch = ({ onOpen }: { onOpen: (t: LibraryTarget) => void }) => {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_bibliotheque", { q: term });
      if (id !== reqId.current) return; // une frappe plus récente a pris le relais
      setHits(error ? [] : ((data as Hit[]) || []));
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Groupé par « Niveau › Matière »
  const groups = useMemo(() => {
    const map = new Map<string, { subject: Subject | undefined; level: string; hits: Hit[] }>();
    for (const h of hits) {
      const [base, level = ""] = h.subject_id.split("|");
      if (!map.has(h.subject_id)) map.set(h.subject_id, { subject: ALL_SUBJECTS.find(s => s.id === base), level, hits: [] });
      map.get(h.subject_id)!.hits.push(h);
    }
    return [...map.values()];
  }, [hits]);

  const open = (g: { subject: Subject | undefined; level: string }, h: Hit) => {
    if (!g.subject || !g.level) return;
    onOpen({
      subject: g.subject,
      level: g.level,
      themeId: h.theme_id ?? (h.kind === "theme" ? h.item_id : "none"),
      chapterId: h.kind === "theme" ? null : h.chapter_id,
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
          placeholder="Chercher dans toute la bibliothèque (thème, chapitre, exercice, document)…"
          className="pl-9 pr-9"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-destructive" aria-label="Effacer la recherche">
            <X size={16} strokeWidth={2.75} />
          </button>
        )}
      </div>

      {q.trim().length >= 2 && (
        <div className="rounded-xl border bg-card p-3 space-y-3 overflow-hidden">
          {loading && hits.length === 0 && <p className="text-xs text-muted-foreground">Recherche…</p>}
          {!loading && hits.length === 0 && <p className="text-xs text-muted-foreground">Aucun résultat pour « {q.trim()} ».</p>}
          {hits.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {hits.length >= 200 ? "200 premiers résultats — précise ta recherche" : `${hits.length} résultat${hits.length > 1 ? "s" : ""}`}
            </p>
          )}
          {groups.map(g => (
            <div key={(g.subject?.id || "") + g.level} className="space-y-1">
              <p className="text-xs font-bold [overflow-wrap:anywhere]" style={{ color: g.subject?.color }}>
                {g.level} › {g.subject?.icon} {g.subject?.label || "Matière inconnue"}
              </p>
              {g.hits.map(h => (
                <button key={h.kind + h.item_id} onClick={() => open(g, h)}
                  className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                  <span className="shrink-0" title={KIND[h.kind].label}>{KIND[h.kind].icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium [overflow-wrap:anywhere]">{h.item_title}</span>
                    <span className="block text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                      {KIND[h.kind].label}
                      {h.kind !== "theme" && ` · ${h.theme_title || "Sans thème"}`}
                      {(h.kind === "exercise" || h.kind === "defi" || h.kind === "document") && h.chapter_title && ` › ${h.chapter_title}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibrarySearch;
