import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, X, Pencil, Check, Lock, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { moveToTrash } from "@/lib/trash";
import { withSecretsForTrash } from "@/lib/exerciseSecrets";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ChapterTabs from "./chapter/ChapterTabs";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Chapter, ChapterDoc, StudentProfile } from "./chapter/chapterShared";

interface ChapterManagerProps {
  subjectId: string;
  manageMode?: boolean;
  themeId?: string;
  filterUnthemed?: boolean;
  /** Couleur du grand thème (onglets, boutons) */
  themeColor?: string;
  /** Chapitres remplis (admin) : id → true/false, calculé une fois par matière dans ThemeManager */
  filledMap?: Record<string, boolean>;
  /** Ouvrir directement ce chapitre (recherche dans la bibliothèque) */
  initialChapterId?: string | null;
}

const CHAPTER_PALETTE = [
  "hsl(32, 80%, 50%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(280, 60%, 50%)",
  "hsl(0, 60%, 50%)",
  "hsl(45, 80%, 45%)",
  "hsl(200, 60%, 45%)",
  "hsl(330, 60%, 55%)",
  "hsl(25, 70%, 45%)",
  "hsl(160, 50%, 40%)",
  "hsl(260, 50%, 55%)",
  "hsl(350, 65%, 50%)",
];


const ChapterManager = ({ subjectId, manageMode, themeId, filterUnthemed, themeColor, filledMap, initialChapterId }: ChapterManagerProps) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  // Extraire le niveau scolaire du subjectId composite (ex: "mathematique|3ème" → "3ème")
  const niveau = subjectId.includes("|") ? subjectId.split("|")[1] : null;
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [actionsChapter, setActionsChapter] = useState<string | null>(null);
  const [chapterAccessOpen, setChapterAccessOpen] = useState<string | null>(null);
  const [chapterDocs, setChapterDocs] = useState<Record<string, ChapterDoc[]>>({});
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const dirtyRef = useRef<Set<string>>(new Set());
  const chaptersRef = useRef<Chapter[]>([]);
  chaptersRef.current = chapters;
  const initialApplied = useRef(false);

  const setDirty = (id: string, on: boolean) => {
    const next = new Set(dirtyRef.current);
    if (on) next.add(id); else next.delete(id);
    dirtyRef.current = next;
    setDirtyIds(next);
  };

  useEffect(() => {
    fetchChapters();
    if (isAdmin && manageMode) fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, themeId, filterUnthemed]);

  // Ouverture directe d'un chapitre (depuis la recherche), une seule fois
  useEffect(() => {
    if (initialApplied.current || !initialChapterId) return;
    if (chapters.some(c => c.id === initialChapterId)) {
      initialApplied.current = true;
      setExpandedChapter(initialChapterId);
      if (!chapterDocs[initialChapterId]) fetchChapterDocs(initialChapterId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, initialChapterId]);

  // En direct : chapitres (sans vider la liste, pas de clignotement), documents des chapitres déjà ouverts,
  // et liste des élèves pour la carte « Accès élèves ». Les champs de saisie en cours ne sont pas touchés.
  useRealtimeRefresh(["subject_chapters"], () => fetchChapters(false), !!subjectId);
  useRealtimeRefresh(["chapter_documents"], () => { Object.keys(chapterDocs).forEach(id => fetchChapterDocs(id)); }, !!subjectId);
  useRealtimeRefresh(["profiles"], () => fetchProfiles(), isAdmin && manageMode);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, first_name, school_level").eq("is_approved", true).neq("email", ADMIN_EMAIL);
    if (data) setProfiles(data as StudentProfile[]);
  };

  const fetchChapters = async (clear = true) => {
    if (clear) setChapters([]);
    let q = supabase.from("subject_chapters").select("*").eq("subject_id", subjectId).order("order_index");
    // Élève : ne voir que les chapitres où il est explicitement listé
    if (!isAdmin && user) {
      q = q.contains("target_student_ids", [user.id]);
    }
    if (themeId) {
      q = q.eq("theme_id", themeId);
    } else if (filterUnthemed) {
      q = q.is("theme_id", null);
    }
    const { data } = await q;
    if (!data) return;
    // Un chapitre en cours de modification garde ce qui est en train d'être tapé (cours, révision, liens)
    const local = new Map(chaptersRef.current.map(c => [c.id, c]));
    const merged = (data as unknown as Chapter[]).map(c => {
      const mine = local.get(c.id);
      if (!mine || !dirtyRef.current.has(c.id)) return c;
      return { ...c, description: mine.description, revision: mine.revision, youtube_links: mine.youtube_links };
    });
    setChapters(merged);
  };

  const patchChapter = (id: string, patch: Partial<Chapter>) => {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    setDirty(id, true);
  };

  const toggleChapterStudent = async (chapter: Chapter, studentId: string) => {
    const current = chapter.target_student_ids || [];
    let updated: string[];
    if (current.includes(studentId)) {
      updated = current.filter(id => id !== studentId);
    } else {
      updated = [...current, studentId];
    }
    await supabase.from("subject_chapters").update({ target_student_ids: updated }).eq("id", chapter.id);
    setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, target_student_ids: updated } : c));
  };

  // Depuis un exercice donné à un élève : partager aussi le chapitre (sinon il ne le voit pas)
  const shareChapterWith = async (chapter: Chapter, studentId: string) => {
    const current = chapters.find(c => c.id === chapter.id)?.target_student_ids || [];
    if (current.includes(studentId)) return;
    const updated = [...current, studentId];
    const { error } = await supabase.from("subject_chapters").update({ target_student_ids: updated }).eq("id", chapter.id);
    if (error) { toast.error("Impossible de partager le chapitre"); return; }
    setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, target_student_ids: updated } : c));
    toast.success("Chapitre partagé avec l'élève");
  };

  const fetchChapterDocs = async (chapterId: string) => {
    const { data } = await supabase.from("chapter_documents").select("*").eq("chapter_id", chapterId).order("created_at");
    if (data) setChapterDocs(prev => ({ ...prev, [chapterId]: data as unknown as ChapterDoc[] }));
  };

  const createChapter = async () => {
    if (!newChapterTitle.trim()) return;
    const insertData: TablesInsert<"subject_chapters"> = {
      subject_id: subjectId,
      title: newChapterTitle.trim(),
      created_by: user?.id,
      order_index: chapters.length,
    };
    if (themeId) {
      insertData.theme_id = themeId;
    }
    await supabase.from("subject_chapters").insert(insertData);
    setNewChapterTitle("");
    toast.success("Chapitre créé !");
    fetchChapters();
  };

  // Le chapitre ET tout son contenu (documents, exercices, flashcards) passent par la corbeille avant la suppression
  // en cascade : chaque élément reste restaurable (restaurer d'abord le chapitre, puis son contenu).
  const deleteChapter = async (id: string) => {
    const chapter = chapters.find(c => c.id === id);
    if (chapter && user) {
      await moveToTrash(user.id, "subject_chapter", id, chapter.title, chapter);
      const [{ data: docs }, { data: exs }, { data: cards }] = await Promise.all([
        supabase.from("chapter_documents").select("*").eq("chapter_id", id),
        // exercices + leur corrigé / historique (table secrète) : copie complète pour la corbeille
        supabase.from("chapter_exercises").select("*").eq("chapter_id", id)
          .then(async r => ({ data: r.data ? await withSecretsForTrash(r.data) : null })),
        supabase.from("chapter_flashcards").select("*").eq("chapter_id", id),
      ]);
      await Promise.all([
        ...(docs || []).map(d => moveToTrash(user.id, "chapter_document", d.id, `${d.file_name} (chapitre « ${chapter.title} »)`, d)),
        ...(exs || []).map(e => moveToTrash(user.id, "chapter_exercise", e.id, `${e.kind === "defi" ? "Défi : " : ""}${e.title} (chapitre « ${chapter.title} »)`, e)),
        ...(cards || []).map(f => moveToTrash(user.id, "chapter_flashcard", f.id, `Flashcard : ${f.front.slice(0, 60)} (chapitre « ${chapter.title} »)`, f)),
      ]);
    }
    await supabase.from("subject_chapters").delete().eq("id", id);
    toast.success("Chapitre mis dans la corbeille");
    setDirty(id, false);
    if (expandedChapter === id) setExpandedChapter(null);
    if (actionsChapter === id) setActionsChapter(null);
    fetchChapters();
  };

  const updateChapter = async (chapter: Chapter) => {
    const { error } = await supabase.from("subject_chapters").update({
      title: chapter.title,
      description: chapter.description,
      revision: chapter.revision,
      youtube_links: chapter.youtube_links,
      updated_at: new Date().toISOString(),
    }).eq("id", chapter.id);
    if (error) { toast.error("La sauvegarde a échoué — tes modifications restent à l'écran, réessaie"); return; }
    setDirty(chapter.id, false);
    toast.success("Chapitre sauvegardé !");
  };

  const saveChapterTitle = async (id: string) => {
    if (!editingChapterTitle.trim()) return;
    await supabase.from("subject_chapters").update({ title: editingChapterTitle.trim() }).eq("id", id);
    setChapters(prev => prev.map(c => c.id === id ? { ...c, title: editingChapterTitle.trim() } : c));
    setEditingChapterId(null);
    toast.success("Chapitre renommé !");
  };

  const toggleExpand = (chapterId: string) => {
    if (expandedChapter === chapterId) {
      setExpandedChapter(null);
    } else {
      setExpandedChapter(chapterId);
      if (!chapterDocs[chapterId]) fetchChapterDocs(chapterId);
    }
  };

  const levelProfiles = niveau ? profiles.filter(p => p.school_level === niveau) : profiles;

  return (
    <div className="space-y-3">
      {!themeId && !filterUnthemed && (
        <h4 className="font-semibold text-sm flex items-center gap-2">📂 Chapitres</h4>
      )}

      {(isAdmin && manageMode) && !expandedChapter && (
        <div className="flex gap-2">
          <Input
            value={newChapterTitle}
            onChange={e => setNewChapterTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createChapter()}
            placeholder="Nom du nouveau chapitre..."
            className="flex-1"
          />
          <Button onClick={createChapter} size="sm"><Plus size={14} className="mr-1" />Créer</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {chapters.map((chapter, idx) => ({ chapter, idx })).filter(({ chapter }) => !expandedChapter || chapter.id === expandedChapter).map(({ chapter, idx }) => {
          // Couleur fixée par la position dans la liste complète (ne change pas quand le chapitre s'ouvre)
          const color = CHAPTER_PALETTE[idx % CHAPTER_PALETTE.length];
          const tabColor = themeColor || color;
          const filled = filledMap ? !!filledMap[chapter.id] : null;
          const isExpanded = expandedChapter === chapter.id;
          const showActions = actionsChapter === chapter.id;

          return (
            <div
              key={chapter.id}
              className={cn(
                "bg-card rounded-xl shadow-sm border-2 overflow-hidden transition-all relative min-h-[64px]",
                isExpanded && "col-span-2"
              )}
              style={{ borderColor: color }}
            >
              {/* Zone cliquable → ouvre le contenu */}
              <div
                className="p-4 pr-10 cursor-pointer hover:bg-secondary/20 transition-colors min-h-[64px] flex items-center"
                onClick={() => toggleExpand(chapter.id)}
              >
                {editingChapterId === chapter.id ? (
                  <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                    <Input
                      value={editingChapterTitle}
                      onChange={e => setEditingChapterTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveChapterTitle(chapter.id);
                        if (e.key === "Escape") setEditingChapterId(null);
                      }}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <button onClick={() => saveChapterTitle(chapter.id)} className="p-1 text-green-600 hover:text-green-700 shrink-0">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingChapterId(null)} className="p-1 text-destructive hover:text-destructive/80 shrink-0" aria-label="Annuler">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {(isAdmin && manageMode) && filled !== null && (
                      <span
                        className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
                        style={{ borderColor: color, backgroundColor: filled ? color : "transparent" }}
                        title={filled ? "Chapitre rempli" : "Chapitre encore vide"}
                        aria-label={filled ? "Chapitre rempli" : "Chapitre encore vide"}
                      />
                    )}
                    <span className="font-semibold text-sm leading-tight min-w-0 [overflow-wrap:anywhere]" style={{ color }}>{chapter.title}</span>
                    {chapter.target_student_ids && chapter.target_student_ids.length > 0 && (
                      <span title={`Restreint à ${chapter.target_student_ids.length} élève(s)`}>
                        <Lock size={11} className="text-muted-foreground shrink-0" />
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Flèche ▼ → révèle les actions (admin seulement) */}
              {(isAdmin && manageMode) && <button
                className="absolute top-3 right-3 p-1 rounded hover:bg-secondary/40 transition-colors"
                onClick={e => { e.stopPropagation(); setActionsChapter(showActions ? null : chapter.id); }}
              >
                {showActions ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>}

              {/* Carte "Accès élèves" — visible directement sous le titre (admin seulement) */}
              {(isAdmin && manageMode) && (() => {
                const isOpen = chapterAccessOpen === chapter.id;
                const sharedCount = chapter.target_student_ids?.length ?? 0;
                return (
                  <div className="border-t border-border/30 mx-3 mb-2" onClick={e => e.stopPropagation()}>
                    <button
                      className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-secondary/30 rounded transition-colors"
                      onClick={() => setChapterAccessOpen(isOpen ? null : chapter.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Accès élèves</span>
                        {sharedCount > 0 ? (
                          <span className="bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            {sharedCount} élève{sharedCount > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">non partagé</span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="pb-2 px-2 space-y-0.5">
                        {levelProfiles.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-1">Aucun élève de ce niveau</p>
                        ) : levelProfiles.map(p => (
                          <label key={p.user_id} className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                            <Checkbox
                              checked={chapter.target_student_ids?.includes(p.user_id) ?? false}
                              onCheckedChange={() => toggleChapterStudent(chapter, p.user_id)}
                            />
                            <span className="font-medium">{p.first_name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Panneau actions (admin) */}
              {showActions && (isAdmin && manageMode) && (
                <div className="border-t border-border/40" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2 px-4 py-2">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditingChapterId(chapter.id); setEditingChapterTitle(chapter.title); setActionsChapter(null); }}
                    >
                      <Pencil size={12} />Renommer
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive/80">
                          <Trash2 size={12} />Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce chapitre ?</AlertDialogTitle>
                          <AlertDialogDescription>Le chapitre et tout son contenu (documents, exercices, défis, flashcards) iront dans la corbeille (Paramètres), d'où tu pourras les restaurer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteChapter(chapter.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {/* Contenu étendu : onglets (Cours, Vidéo, Révision, Fiches visuelles, Quiz, Exercices, Défis, Flashcards, Documents) */}
              {isExpanded && (
                <div className="border-t border-border p-3 sm:p-4 space-y-4" onClick={e => e.stopPropagation()}>
                  <ChapterTabs
                    chapter={chapter}
                    docs={chapterDocs[chapter.id] || []}
                    manage={!!(isAdmin && manageMode)}
                    color={tabColor}
                    levelProfiles={levelProfiles}
                    niveau={niveau}
                    onChapterChange={patch => patchChapter(chapter.id, patch)}
                    onDocsChanged={() => fetchChapterDocs(chapter.id)}
                    onShareChapter={studentId => shareChapterWith(chapter, studentId)}
                  />

                  {/* ── Sauvegarder (admin) : cours, révision, vidéos & liens ── */}
                  {(isAdmin && manageMode) && (
                    <div className="space-y-1">
                      {dirtyIds.has(chapter.id) && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 text-center">● Modifications pas encore enregistrées</p>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="w-full text-white" style={{ backgroundColor: tabColor }}>Sauvegarder le chapitre</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Sauvegarder les modifications ?</AlertDialogTitle>
                            <AlertDialogDescription className="[overflow-wrap:anywhere]">
                              Le cours, la fiche de révision et les liens du chapitre « {chapter.title} » seront enregistrés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => updateChapter(chapter)}>Confirmer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {chapters.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          {(isAdmin && manageMode) ? "Aucun chapitre — créez-en un ci-dessus." : "Aucun chapitre disponible."}
        </p>
      )}
    </div>
  );
};

export default ChapterManager;
