import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, Youtube, X, FileText, Camera, Copy, ExternalLink, Pencil, Check, Lock, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { YoutubePlayer, isYoutubeUrl, extractYoutubeVideoId, extractPlaylistId, fetchPlaylistVideos } from "@/utils/youtube";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import QuizManager from "./QuizManager";
import QuizPlayer from "./QuizPlayer";

interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  youtube_links: string[];
  order_index: number;
  target_student_id: string | null;
  target_student_ids: string[] | null;
}

interface StudentProfile {
  user_id: string;
  first_name: string;
  school_level: string;
}

interface ChapterDoc {
  id: string;
  chapter_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_by: string | null;
}

interface ChapterManagerProps {
  subjectId: string;
  manageMode?: boolean;
  themeId?: string;
  filterUnthemed?: boolean;
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

const ChapterManager = ({ subjectId, manageMode, themeId, filterUnthemed }: ChapterManagerProps) => {
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
  const [newLinkInputs, setNewLinkInputs] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [fetchingLinks, setFetchingLinks] = useState<Record<string, boolean>>({});
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);

  useEffect(() => {
    fetchChapters();
    if (isAdmin && manageMode) fetchProfiles();
  }, [subjectId, themeId, filterUnthemed]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, first_name, school_level").eq("is_approved", true).neq("email", ADMIN_EMAIL);
    if (data) setProfiles(data as StudentProfile[]);
  };

  const fetchChapters = async () => {
    setChapters([]);
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
    if (data) setChapters(data as Chapter[]);
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

  const fetchChapterDocs = async (chapterId: string) => {
    const { data } = await supabase.from("chapter_documents").select("*").eq("chapter_id", chapterId).order("created_at");
    if (data) setChapterDocs(prev => ({ ...prev, [chapterId]: data as ChapterDoc[] }));
  };

  const createChapter = async () => {
    if (!newChapterTitle.trim()) return;
    const insertData: any = {
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

  const deleteChapter = async (id: string) => {
    await supabase.from("subject_chapters").delete().eq("id", id);
    toast.success("Chapitre supprimé");
    if (expandedChapter === id) setExpandedChapter(null);
    if (actionsChapter === id) setActionsChapter(null);
    fetchChapters();
  };

  const updateChapter = async (chapter: Chapter) => {
    await supabase.from("subject_chapters").update({
      title: chapter.title,
      description: chapter.description,
      youtube_links: chapter.youtube_links,
      updated_at: new Date().toISOString(),
    }).eq("id", chapter.id);
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

  const handleFileUpload = async (chapterId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filePath = `chapters/${chapterId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("subject-files").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("subject-files").getPublicUrl(filePath);
      await supabase.from("chapter_documents").insert({
        chapter_id: chapterId, file_name: file.name,
        file_url: publicUrl, file_type: file.type, uploaded_by: user?.id,
      });
      toast.success("Fichier téléversé !");
      fetchChapterDocs(chapterId);
    } catch {
      toast.error("Erreur lors du téléversement");
    }
    setUploading(false);
  };

  const deleteDoc = async (docId: string, chapterId: string) => {
    await supabase.from("chapter_documents").delete().eq("id", docId);
    toast.success("Document supprimé");
    fetchChapterDocs(chapterId);
  };

  const addLink = async (chapter: Chapter) => {
    const link = newLinkInputs[chapter.id]?.trim();
    if (!link) return;
    const playlistId = extractPlaylistId(link);
    if (playlistId) {
      setFetchingLinks(prev => ({ ...prev, [chapter.id]: true }));
      try {
        const urls = await fetchPlaylistVideos(playlistId);
        if (urls.length === 0) { toast.error("Aucune vidéo trouvée dans cette playlist."); return; }
        setChapters(prev => prev.map(c =>
          c.id === chapter.id ? { ...c, youtube_links: [...(c.youtube_links || []), ...urls] } : c
        ));
        setNewLinkInputs(prev => ({ ...prev, [chapter.id]: "" }));
        toast.success(`${urls.length} vidéo${urls.length > 1 ? 's' : ''} ajoutée${urls.length > 1 ? 's' : ''} dans l'ordre !`);
      } catch {
        toast.error("Impossible de charger la playlist. Vérifie le lien et réessaie.");
      } finally {
        setFetchingLinks(prev => ({ ...prev, [chapter.id]: false }));
      }
    } else {
      setChapters(prev => prev.map(c =>
        c.id === chapter.id ? { ...c, youtube_links: [...(c.youtube_links || []), link] } : c
      ));
      setNewLinkInputs(prev => ({ ...prev, [chapter.id]: "" }));
    }
  };

  const removeLink = (chapter: Chapter, index: number) => {
    setChapters(prev => prev.map(c =>
      c.id === chapter.id ? { ...c, youtube_links: c.youtube_links.filter((_, i) => i !== index) } : c
    ));
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Lien copié !");
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("image")) return "🖼️";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    return "📎";
  };

  const canDeleteDoc = (doc: ChapterDoc) => isAdmin || doc.uploaded_by === user?.id;

  return (
    <div className="space-y-3">
      {!themeId && !filterUnthemed && (
        <h4 className="font-semibold text-sm flex items-center gap-2">📂 Chapitres</h4>
      )}

      {(isAdmin && manageMode) && (
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
        {chapters.map((chapter, idx) => {
          const color = CHAPTER_PALETTE[idx % CHAPTER_PALETTE.length];
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
                    <button onClick={() => setEditingChapterId(null)} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="font-semibold text-sm leading-tight" style={{ color }}>{chapter.title}</span>
                    {chapter.target_student_ids && chapter.target_student_ids.length > 0 && (
                      <span title={`Restreint à ${chapter.target_student_ids.length} élève(s)`}>
                        <Lock size={11} className="text-muted-foreground shrink-0" />
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Flèche ▼ → révèle les actions */}
              <button
                className="absolute top-3 right-3 p-1 rounded hover:bg-secondary/40 transition-colors"
                onClick={e => { e.stopPropagation(); setActionsChapter(showActions ? null : chapter.id); }}
              >
                {showActions ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>

              {/* Carte "Accès élèves" — visible directement sous le titre (admin seulement) */}
              {(isAdmin && manageMode) && (() => {
                const levelProfiles = niveau ? profiles.filter(p => p.school_level === niveau) : profiles;
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
                          <AlertDialogDescription>Tous les documents associés seront aussi supprimés.</AlertDialogDescription>
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

              {/* Contenu étendu */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">

                  {/* ── Description ── */}
                  {(isAdmin && manageMode) ? (
                    <div>
                      <Label className="text-xs">Description / Contenu</Label>
                      <Textarea
                        value={chapter.description || ""}
                        onChange={e => setChapters(prev => prev.map(c =>
                          c.id === chapter.id ? { ...c, description: e.target.value } : c
                        ))}
                        placeholder="Description du chapitre, cours, notes..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                  ) : (
                    chapter.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{chapter.description}</p>
                    )
                  )}

                  {/* ── Documents ── */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <FileText size={12} />Documents
                    </p>
                    {(isAdmin && manageMode) && (
                      <div className="flex gap-2 flex-wrap">
                        <label className="flex items-center gap-1 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors text-xs">
                          <Upload size={14} className="text-primary" />
                          <span className="text-muted-foreground">{uploading ? "..." : "Téléverser"}</span>
                          <input type="file" className="hidden" onChange={e => handleFileUpload(chapter.id, e)} disabled={uploading}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp" />
                        </label>
                        <label className="flex items-center gap-1 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors text-xs">
                          <Camera size={14} className="text-primary" />
                          <span className="text-muted-foreground">Photo</span>
                          <input type="file" className="hidden" onChange={e => handleFileUpload(chapter.id, e)} disabled={uploading}
                            accept="image/*" capture="environment" />
                        </label>
                      </div>
                    )}
                    {(chapterDocs[chapter.id] || []).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg text-xs">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary truncate flex-1">
                          <span>{getFileIcon(doc.file_type)}</span>{doc.file_name}
                        </a>
                        {canDeleteDoc(doc) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-destructive hover:text-destructive/80 p-1">
                                <Trash2 size={12} />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteDoc(doc.id, chapter.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))}
                    {(chapterDocs[chapter.id] || []).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucun document</p>
                    )}
                  </div>

                  {/* ── Liens & Vidéos ── */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Youtube size={12} />Liens & Vidéos
                    </p>
                    {(isAdmin && manageMode) && (
                      <div className="flex gap-2">
                        <Input
                          value={newLinkInputs[chapter.id] || ""}
                          onChange={e => setNewLinkInputs(prev => ({ ...prev, [chapter.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") addLink(chapter); }}
                          placeholder="Vidéo YouTube, playlist ou site web..."
                          className="flex-1 text-xs"
                          disabled={fetchingLinks[chapter.id]}
                        />
                        <Button onClick={() => addLink(chapter)} size="sm" variant="outline" disabled={fetchingLinks[chapter.id]}>
                          {fetchingLinks[chapter.id] ? <span className="text-xs animate-pulse">...</span> : <Plus size={12} />}
                        </Button>
                      </div>
                    )}
                    {(chapter.youtube_links || []).map((link, i) => {
                      const ytId = isYoutubeUrl(link) ? extractYoutubeVideoId(link) : null;
                      return (
                        <div key={i} className="space-y-1">
                          {(isAdmin && manageMode) && (
                            <div className="flex items-center gap-1 p-1 bg-secondary/20 rounded text-xs">
                              {ytId ? <Youtube size={12} className="text-destructive shrink-0" /> : <ExternalLink size={12} className="text-primary shrink-0" />}
                              <span className="truncate flex-1 text-muted-foreground">{link}</span>
                              <button onClick={() => copyLink(link)} className="p-1 text-muted-foreground hover:text-foreground shrink-0" title="Copier">
                                <Copy size={12} />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="p-1 text-muted-foreground hover:text-destructive shrink-0"><X size={12} /></button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Supprimer ce lien ?</AlertDialogTitle></AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeLink(chapter, i)}>Supprimer</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                          {ytId && <YoutubePlayer videoId={ytId} />}
                          {!ytId && (
                            <a href={link} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline break-all">
                              <ExternalLink size={11} />{link}
                            </a>
                          )}
                        </div>
                      );
                    })}
                    {(chapter.youtube_links || []).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucun lien</p>
                    )}
                  </div>

                  {/* ── Quiz ── */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">🧠 Quiz</p>
                    {(isAdmin && manageMode) ? <QuizManager subjectId={chapter.id} /> : <QuizPlayer subjectId={chapter.id} />}
                  </div>

                  {/* ── Sauvegarder (admin) ── */}
                  {(isAdmin && manageMode) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="bg-gradient-primary w-full">Sauvegarder le chapitre</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sauvegarder les modifications ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Les modifications du chapitre « {chapter.title} » seront enregistrées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => updateChapter(chapter)}>Confirmer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
