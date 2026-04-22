import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, Youtube, X, FileText, Camera, Copy, ExternalLink } from "lucide-react";
import { YoutubePlayer, isYoutubeUrl, extractYoutubeVideoId } from "@/utils/youtube";
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
  targetStudentId?: string;
  manageMode?: boolean;
}

const ChapterManager = ({ subjectId, targetStudentId, manageMode }: ChapterManagerProps) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [chapterDocs, setChapterDocs] = useState<Record<string, ChapterDoc[]>>({});
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newLinkInputs, setNewLinkInputs] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchChapters();
  }, [subjectId, targetStudentId]);

  const fetchChapters = async () => {
    let q = supabase.from("subject_chapters").select("*").eq("subject_id", subjectId).order("order_index");
    if (isAdmin && manageMode && targetStudentId && targetStudentId !== "all") {
      q = q.or(`target_student_id.eq.${targetStudentId},target_student_id.is.null`);
    }
    const { data } = await q;
    if (data) setChapters(data as Chapter[]);
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
    if (isAdmin && targetStudentId && targetStudentId !== "all") {
      insertData.target_student_id = targetStudentId;
    }
    await supabase.from("subject_chapters").insert(insertData);
    setNewChapterTitle("");
    toast.success("Chapitre créé !");
    fetchChapters();
  };

  const deleteChapter = async (id: string) => {
    await supabase.from("subject_chapters").delete().eq("id", id);
    toast.success("Chapitre supprimé");
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

  const addLink = (chapter: Chapter) => {
    const link = newLinkInputs[chapter.id]?.trim();
    if (!link) return;
    const updated = { ...chapter, youtube_links: [...(chapter.youtube_links || []), link] };
    setChapters(prev => prev.map(c => c.id === chapter.id ? updated : c));
    setNewLinkInputs(prev => ({ ...prev, [chapter.id]: "" }));
  };

  const removeLink = (chapter: Chapter, index: number) => {
    const updated = { ...chapter, youtube_links: chapter.youtube_links.filter((_, i) => i !== index) };
    setChapters(prev => prev.map(c => c.id === chapter.id ? updated : c));
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
      <h4 className="font-semibold text-sm flex items-center gap-2">📂 Chapitres</h4>

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

      {chapters.map(chapter => (
        <div key={chapter.id} className="border border-border rounded-lg overflow-hidden">
          {/* Header chapitre */}
          <button
            onClick={() => toggleExpand(chapter.id)}
            className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors text-left"
          >
            <span className="font-medium text-sm">{chapter.title}</span>
            <div className="flex items-center gap-1">
              {isAdmin && manageMode && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
                      <Trash2 size={12} className="text-destructive" />
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
              )}
              {expandedChapter === chapter.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {expandedChapter === chapter.id && (
            <div className="border-t border-border p-3 space-y-4">

              {/* ── Titre (éditable en mode admin) ── */}
              {(isAdmin && manageMode) && (
                <div>
                  <Label className="text-xs">Titre du chapitre</Label>
                  <Input
                    value={chapter.title}
                    onChange={e => setChapters(prev => prev.map(c =>
                      c.id === chapter.id ? { ...c, title: e.target.value } : c
                    ))}
                    placeholder="Titre du chapitre..."
                    className="mt-1"
                  />
                </div>
              )}

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

              {/* ── Liens (YouTube, sites web...) ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Youtube size={12} />Liens & Vidéos
                </p>
                {(isAdmin && manageMode) && (
                  <div className="flex gap-2">
                    <Input
                      value={newLinkInputs[chapter.id] || ""}
                      onChange={e => setNewLinkInputs(prev => ({ ...prev, [chapter.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addLink(chapter)}
                      placeholder="Lien YouTube, site web..."
                      className="flex-1 text-xs"
                    />
                    <Button onClick={() => addLink(chapter)} size="sm" variant="outline">
                      <Plus size={12} />
                    </Button>
                  </div>
                )}
                {(chapter.youtube_links || []).map((link, i) => {
                  const ytId = isYoutubeUrl(link) ? extractYoutubeVideoId(link) : null;
                  return (
                    <div key={i} className="space-y-1">
                      {/* Barre URL — visible uniquement pour l'admin */}
                      {(isAdmin && manageMode) && (
                        <div className="flex items-center gap-1 p-1 bg-secondary/20 rounded text-xs">
                          {ytId
                            ? <Youtube size={12} className="text-destructive shrink-0" />
                            : <ExternalLink size={12} className="text-primary shrink-0" />
                          }
                          <span className="truncate flex-1 text-muted-foreground">{link}</span>
                          <button onClick={() => copyLink(link)}
                            className="p-1 text-muted-foreground hover:text-foreground shrink-0" title="Copier le lien">
                            <Copy size={12} />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                                <X size={12} />
                              </button>
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
                      {/* YouTube → lecteur sécurisé (admin + élève) */}
                      {ytId && <YoutubePlayer videoId={ytId} />}
                      {/* Lien non-YouTube → cliquable pour tous */}
                      {!ytId && (
                        <a href={link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline break-all">
                          <ExternalLink size={11} />
                          {link}
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
                {(isAdmin && manageMode) ? (
                  <QuizManager subjectId={chapter.id} />
                ) : (
                  <QuizPlayer subjectId={chapter.id} />
                )}
              </div>

              {/* ── Bouton Sauvegarder (admin) ── */}
              {(isAdmin && manageMode) && (
                <Button onClick={() => updateChapter(chapter)} size="sm" className="bg-gradient-primary w-full">
                  Sauvegarder le chapitre
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      {chapters.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          {(isAdmin && manageMode) ? "Aucun chapitre — créez-en un ci-dessus." : "Aucun chapitre disponible."}
        </p>
      )}
    </div>
  );
};

export default ChapterManager;
