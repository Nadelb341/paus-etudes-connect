import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, Youtube, X, FileText, Camera } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [newYoutubeLinks, setNewYoutubeLinks] = useState<Record<string, string>>({});
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
        chapter_id: chapterId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        uploaded_by: user?.id,
      });
      toast.success("Fichier téléversé !");
      fetchChapterDocs(chapterId);
    } catch {
      toast.error("Erreur lors du téléversement");
    }
    setUploading(false);
  };

  const handlePhotoCapture = async (chapterId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filePath = `chapters/${chapterId}/${Date.now()}_photo_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("subject-files").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("subject-files").getPublicUrl(filePath);
      await supabase.from("chapter_documents").insert({
        chapter_id: chapterId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        uploaded_by: user?.id,
      });
      toast.success("Photo téléversée !");
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

  const addYoutubeLink = (chapter: Chapter) => {
    const link = newYoutubeLinks[chapter.id]?.trim();
    if (!link) return;
    const updated = { ...chapter, youtube_links: [...(chapter.youtube_links || []), link] };
    setChapters(prev => prev.map(c => c.id === chapter.id ? updated : c));
    setNewYoutubeLinks(prev => ({ ...prev, [chapter.id]: "" }));
  };

  const removeYoutubeLink = (chapter: Chapter, index: number) => {
    const updated = { ...chapter, youtube_links: chapter.youtube_links.filter((_, i) => i !== index) };
    setChapters(prev => prev.map(c => c.id === chapter.id ? updated : c));
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
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

      {/* Create chapter */}
      {(isAdmin && manageMode) && (
        <div className="flex gap-2">
          <Input
            value={newChapterTitle}
            onChange={e => setNewChapterTitle(e.target.value)}
            placeholder="Nouveau chapitre..."
            className="flex-1"
          />
          <Button onClick={createChapter} size="sm"><Plus size={14} className="mr-1" />Créer</Button>
        </div>
      )}

      {chapters.map(chapter => (
        <div key={chapter.id} className="border border-border rounded-lg overflow-hidden">
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
            <div className="border-t border-border p-3 space-y-3">
              {/* Description */}
              {(isAdmin && manageMode) ? (
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={chapter.description || ""}
                    onChange={e => setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, description: e.target.value } : c))}
                    placeholder="Description du chapitre..."
                    rows={3}
                  />
                </div>
              ) : (
                chapter.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{chapter.description}</p>
              )}

              {/* Documents */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText size={12} />Documents</p>
                <div className="flex gap-2 flex-wrap">
                  <label className="flex items-center gap-1 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors text-xs">
                    <Upload size={14} className="text-primary" />
                    <span className="text-muted-foreground">{uploading ? "..." : "Téléverser"}</span>
                    <input type="file" className="hidden" onChange={e => handleFileUpload(chapter.id, e)} disabled={uploading} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp" />
                  </label>
                  <label className="flex items-center gap-1 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors text-xs">
                    <Camera size={14} className="text-primary" />
                    <span className="text-muted-foreground">Photo</span>
                    <input type="file" className="hidden" onChange={e => handlePhotoCapture(chapter.id, e)} disabled={uploading} accept="image/*" capture="environment" />
                  </label>
                </div>
                {(chapterDocs[chapter.id] || []).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg text-xs">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary truncate">
                      <span>{getFileIcon(doc.file_type)}</span>{doc.file_name}
                    </a>
                    {canDeleteDoc(doc) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-destructive hover:text-destructive/80 p-1"><Trash2 size={12} /></button>
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
              </div>

              {/* YouTube links */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Youtube size={12} />Vidéos</p>
                <div className="flex gap-2">
                  <Input
                    value={newYoutubeLinks[chapter.id] || ""}
                    onChange={e => setNewYoutubeLinks(prev => ({ ...prev, [chapter.id]: e.target.value }))}
                    placeholder="Lien YouTube..."
                    className="flex-1 text-xs"
                  />
                  <Button onClick={() => addYoutubeLink(chapter)} size="sm" variant="outline"><Plus size={12} /></Button>
                </div>
                {(chapter.youtube_links || []).map((link, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between p-1 text-xs">
                      <span className="truncate flex-1 text-muted-foreground">{link}</span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1"><X size={12} /></button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Supprimer ce lien ?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeYoutubeLink(chapter, i)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe src={getYoutubeEmbedUrl(link)} className="w-full h-full" allowFullScreen />
                    </div>
                  </div>
                ))}
              </div>

              {/* Save button for admin */}
              {(isAdmin && manageMode) && (
                <Button onClick={() => updateChapter(chapter)} size="sm" className="bg-gradient-primary">
                  Sauvegarder le chapitre
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      {chapters.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun chapitre</p>}
    </div>
  );
};

export default ChapterManager;
