import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { fetchExerciseSecrets } from "@/lib/exerciseSecrets";
import { loadDraft } from "@/hooks/useDraftRecovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Youtube, ExternalLink, Copy, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { YoutubePlayer, isYoutubeUrl, extractYoutubeVideoId, extractPlaylistId, fetchPlaylistVideos } from "@/utils/youtube";
import QuizManager from "../QuizManager";
import QuizPlayer from "../QuizPlayer";
import { Chapter, ChapterDoc, Exercise, Flashcard, StudentProfile } from "./chapterShared";
import { RichTextEditor, RichTextView } from "./SimpleRichText";
import DocumentsTab from "./DocumentsTab";
import ExercisesTab from "./ExercisesTab";
import FlashcardsTab from "./FlashcardsTab";

type TabKey = "cours" | "videos" | "revision" | "fiches" | "quiz" | "exercices" | "flashcards" | "documents";

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "cours", icon: "📖", label: "Cours" },
  { key: "videos", icon: "🎬", label: "Vidéos & liens" },
  { key: "revision", icon: "📝", label: "Révision" },
  { key: "fiches", icon: "🖼️", label: "Fiches visuelles" },
  { key: "quiz", icon: "🧠", label: "Quiz" },
  { key: "exercices", icon: "✏️", label: "Exercices" },
  { key: "flashcards", icon: "🃏", label: "Flashcards" },
  { key: "documents", icon: "📄", label: "Documents" },
];

interface Props {
  chapter: Chapter;
  docs: ChapterDoc[];
  manage: boolean;
  color: string;
  levelProfiles: StudentProfile[];
  niveau: string | null;
  onChapterChange: (patch: Partial<Chapter>) => void;
  onDocsChanged: () => void;
  onShareChapter: (studentId: string) => void;
}

// Jamais solution/done_log ici (vides en base de toute façon) : ils vivent dans chapter_exercise_secrets
const EXERCISE_STUDENT_COLUMNS = "id, chapter_id, title, statement, difficulty, files, order_index, target_student_ids, solution_visible_to_students, created_at";

const ChapterTabs = ({ chapter, docs, manage, color, levelProfiles, niveau, onChapterChange, onDocsChanged, onShareChapter }: Props) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [fetchingLinks, setFetchingLinks] = useState(false);
  const [active, setActive] = useState<TabKey | null>(() => {
    // Un brouillon en cours sur ce chapitre → on ouvre directement le bon onglet (reprise)
    if (manage && loadDraft(`pausetude_exercise_${chapter.id}`)) return "exercices";
    if (manage && loadDraft(`pausetude_flashcard_${chapter.id}`)) return "flashcards";
    return manage ? "cours" : null;
  });

  const fetchExercises = async () => {
    const { data } = await supabase.from("chapter_exercises").select(EXERCISE_STUDENT_COLUMNS).eq("chapter_id", chapter.id).order("order_index").order("created_at");
    const list = (data as unknown as Exercise[]) || [];
    if (manage) {
      // Admin : corrigé + historique « fait avec » rangés dans la table secrète
      const secrets = await fetchExerciseSecrets(list.map(e => e.id));
      list.forEach(e => { const s = secrets.get(e.id); e.solution = s?.solution || ""; e.done_log = s?.done_log || []; });
      setExercises(list);
      return;
    }
    // Élève : seuls les corrigés rendus visibles par l'enseignante, renvoyés par la base (jamais l'historique)
    if (list.some(e => e.solution_visible_to_students)) {
      const { data: sols } = await supabase.rpc("exercise_solutions_visibles", { p_chapter: chapter.id });
      const map = new Map((sols || []).map(s => [s.exercise_id, s.solution]));
      list.forEach(e => { if (map.has(e.id)) e.solution = map.get(e.id) || ""; });
    }
    setExercises(list);
  };

  const fetchFlashcards = async () => {
    const { data } = await supabase.from("chapter_flashcards").select("*").eq("chapter_id", chapter.id).order("order_index").order("created_at");
    setFlashcards((data as Flashcard[]) || []);
  };

  const fetchQuizCount = async () => {
    const { count } = await supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("subject_id", chapter.id);
    setQuizCount(count ?? 0);
  };

  useEffect(() => {
    setLoaded(false);
    Promise.all([fetchExercises(), fetchFlashcards(), fetchQuizCount()]).then(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id, manage]);

  // En direct (les formulaires ouverts gardent leur propre état : seules les listes sont rechargées)
  useRealtimeRefresh(["chapter_exercises"], () => fetchExercises());
  useRealtimeRefresh(["chapter_exercise_secrets"], () => fetchExercises(), manage);
  useRealtimeRefresh(["chapter_flashcards"], () => fetchFlashcards());
  useRealtimeRefresh(["quizzes"], () => fetchQuizCount());

  const fiches = docs.filter(d => d.category === "fiche");
  const plainDocs = docs.filter(d => d.category !== "fiche");
  const links = chapter.youtube_links || [];

  const counts: Record<TabKey, number> = useMemo(() => ({
    cours: (chapter.description || "").trim() ? 1 : 0,
    videos: links.length,
    revision: (chapter.revision || "").trim() ? 1 : 0,
    fiches: fiches.length,
    quiz: quizCount,
    exercices: exercises.length,
    flashcards: flashcards.length,
    documents: plainDocs.length,
  }), [chapter.description, chapter.revision, links.length, fiches.length, quizCount, exercises.length, flashcards.length, plainDocs.length]);

  // Côté élève : un onglet vide est masqué
  const visibleTabs = manage ? TABS : TABS.filter(t => counts[t.key] > 0);
  const current: TabKey | null = active && visibleTabs.some(t => t.key === active) ? active : (visibleTabs[0]?.key ?? null);

  const addLink = async () => {
    const link = newLink.trim();
    if (!link) return;
    const playlistId = extractPlaylistId(link);
    if (playlistId) {
      setFetchingLinks(true);
      try {
        const urls = await fetchPlaylistVideos(playlistId);
        if (urls.length === 0) { toast.error("Aucune vidéo trouvée dans cette playlist."); return; }
        onChapterChange({ youtube_links: [...links, ...urls] });
        setNewLink("");
        toast.success(`${urls.length} vidéo${urls.length > 1 ? "s" : ""} ajoutée${urls.length > 1 ? "s" : ""} — pense à sauvegarder le chapitre`);
      } catch {
        toast.error("Impossible de charger la playlist. Vérifie le lien et réessaie.");
      } finally {
        setFetchingLinks(false);
      }
    } else {
      onChapterChange({ youtube_links: [...links, link] });
      setNewLink("");
    }
  };

  const emptyText = (icon: string, text: string) => (
    <div className="text-center py-6 px-3 rounded-xl border border-dashed" style={{ borderColor: color }}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );

  if (!manage && loaded && visibleTabs.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Ce chapitre n'a pas encore de contenu.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Barre d'onglets : défile sur téléphone, passe à la ligne sur tablette/ordinateur */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible">
        {visibleTabs.map(t => {
          const on = current === t.key;
          const n = counts[t.key];
          return (
            <button key={t.key} onClick={() => setActive(t.key)}
              className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors"
              style={on ? { backgroundColor: color, borderColor: color, color: "white" } : { borderColor: color + "77", color }}>
              <span>{t.icon}</span>{t.label}
              {n > 0 && (t.key !== "cours" && t.key !== "revision") && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={on ? { backgroundColor: "white", color } : { backgroundColor: color, color: "white" }}>{n}</span>
              )}
              {n > 0 && (t.key === "cours" || t.key === "revision") && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: on ? "white" : color }} />
              )}
            </button>
          );
        })}
      </div>

      {current === "cours" && (
        manage ? (
          <div className="space-y-1.5">
            {!counts.cours && <p className="text-xs text-muted-foreground">📖 Écris ici le cours du chapitre : l'essentiel à comprendre, avec des titres et des listes.</p>}
            <RichTextEditor value={chapter.description || ""} onChange={t => onChapterChange({ description: t })}
              placeholder="Le cours du chapitre…" rows={10} />
          </div>
        ) : <RichTextView text={chapter.description || ""} color={color} />
      )}

      {current === "revision" && (
        manage ? (
          <div className="space-y-1.5">
            {!counts.revision && <p className="text-xs text-muted-foreground">📝 La fiche de révision : les points clés à retenir, en quelques lignes.</p>}
            <RichTextEditor value={chapter.revision || ""} onChange={t => onChapterChange({ revision: t })}
              placeholder="- Définition à retenir&#10;- Méthode en 3 étapes&#10;- Piège à éviter" rows={8} />
          </div>
        ) : (
          <div className="rounded-xl p-3 border-l-4 bg-secondary/20" style={{ borderColor: color }}>
            <RichTextView text={chapter.revision || ""} color={color} />
          </div>
        )
      )}

      {current === "videos" && (
        <div className="space-y-2">
          {manage && (
            <div className="flex gap-2">
              <Input value={newLink} onChange={e => setNewLink(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                placeholder="Vidéo YouTube, playlist ou site web…" className="flex-1 min-w-0 text-xs" disabled={fetchingLinks} />
              <Button onClick={addLink} size="sm" variant="outline" disabled={fetchingLinks} aria-label="Ajouter le lien">
                {fetchingLinks ? <span className="text-xs animate-pulse">…</span> : <Plus size={14} />}
              </Button>
            </div>
          )}
          {links.length === 0 && emptyText("🎬", "Pas encore de vidéo ni de lien. Colle une vidéo YouTube, une playlist ou un site utile.")}
          {links.map((link, i) => {
            const ytId = isYoutubeUrl(link) ? extractYoutubeVideoId(link) : null;
            return (
              <div key={link + i} className="space-y-1">
                {manage && (
                  <div className="flex items-center gap-1 p-1 bg-secondary/20 rounded text-xs overflow-hidden">
                    {ytId ? <Youtube size={12} className="text-destructive shrink-0" /> : <ExternalLink size={12} className="text-primary shrink-0" />}
                    <span className="flex-1 min-w-0 text-muted-foreground [overflow-wrap:anywhere]">{link}</span>
                    <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Lien copié !"); }} className="p-1 text-muted-foreground hover:text-foreground shrink-0" title="Copier">
                      <Copy size={12} />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1 text-destructive shrink-0" aria-label="Retirer le lien"><X size={14} /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Supprimer ce lien ?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onChapterChange({ youtube_links: links.filter((_, j) => j !== i) })}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                {ytId && <YoutubePlayer videoId={ytId} />}
                {!ytId && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline [overflow-wrap:anywhere]">
                    <ExternalLink size={11} className="shrink-0" />{link}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {current === "fiches" && (
        <DocumentsTab chapterId={chapter.id} category="fiche" docs={fiches} manage={manage} color={color} onChanged={onDocsChanged} />
      )}
      {current === "documents" && (
        <DocumentsTab chapterId={chapter.id} category="document" docs={plainDocs} manage={manage} color={color} onChanged={onDocsChanged} />
      )}

      {current === "quiz" && (
        manage ? <QuizManager subjectId={chapter.id} /> : <QuizPlayer subjectId={chapter.id} />
      )}

      {current === "exercices" && (
        <ExercisesTab chapter={chapter} exercises={exercises} manage={manage} color={color}
          levelProfiles={levelProfiles} niveau={niveau} onChanged={fetchExercises} onShareChapter={onShareChapter} />
      )}

      {current === "flashcards" && (
        <FlashcardsTab chapterId={chapter.id} cards={flashcards} manage={manage} color={color} onChanged={fetchFlashcards} />
      )}
    </div>
  );
};

export default ChapterTabs;
