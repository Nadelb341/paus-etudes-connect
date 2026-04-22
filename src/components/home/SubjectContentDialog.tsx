import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { toast } from "sonner";
import { Upload, Trash2, FileText, Youtube, Plus, X, Camera, ChevronUp } from "lucide-react";
import QuizManager from "./QuizManager";
import QuizPlayer from "./QuizPlayer";
import ChapterManager from "./ChapterManager";
import ThemeManager from "./ThemeManager";
import SubjectComments from "./SubjectComments";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SubjectContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectLabel: string;
  subjectIcon: string;
  subjectColor: string;
  manageMode?: boolean;
}

interface ContentData { id?: string; title: string; description: string; youtube_links: string[]; }
interface DocFile { id: string; file_name: string; file_url: string; file_type: string; uploaded_by: string | null; }
interface Profile { user_id: string; first_name: string; email: string; school_level: string; }

const SubjectContentDialog = ({ open, onOpenChange, subjectId, subjectLabel, subjectIcon, subjectColor, manageMode }: SubjectContentDialogProps) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [content, setContent] = useState<ContentData>({ title: "", description: "", youtube_links: [] });
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [newYoutubeLink, setNewYoutubeLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [targetStudentId, setTargetStudentId] = useState<string>("all");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchContent();
      fetchDocuments();
      if (isAdmin && manageMode) fetchProfiles();
    }
  }, [open, subjectId, targetStudentId]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, first_name, email, school_level").eq("is_approved", true);
    if (data) setProfiles(data.filter(p => p.email !== ADMIN_EMAIL));
  };

  const fetchContent = async () => {
    const studentFilter = isAdmin && manageMode && targetStudentId !== "all" ? targetStudentId : null;
    let q: any = supabase.from("subject_content").select("*").eq("subject_id", subjectId);
    if (studentFilter) q = q.eq("target_student_id", studentFilter);
    else if (isAdmin && manageMode) q = q.is("target_student_id", null);
    const { data } = await q.maybeSingle();
    if (data) {
      setContent({ id: data.id, title: data.title || "", description: data.description || "", youtube_links: data.youtube_links || [] });
    } else {
      setContent({ title: "", description: "", youtube_links: [] });
    }
  };

  const fetchDocuments = async () => {
    const studentFilter = isAdmin && manageMode && targetStudentId !== "all" ? targetStudentId : null;
    let dq: any = supabase.from("subject_documents").select("*").eq("subject_id", subjectId).order("created_at", { ascending: false });
    if (studentFilter) dq = dq.eq("target_student_id", studentFilter);
    const { data } = await dq;
    if (data) setDocuments(data);
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      const studentId = targetStudentId === "all" ? null : targetStudentId;
      if (content.id) {
        await supabase.from("subject_content").update({
          title: content.title, description: content.description,
          youtube_links: content.youtube_links, updated_at: new Date().toISOString(),
        }).eq("id", content.id);
      } else {
        const insertData: any = {
          subject_id: subjectId, title: content.title, description: content.description,
          youtube_links: content.youtube_links, created_by: user?.id,
        };
        if (studentId) insertData.target_student_id = studentId;
        const { data } = await supabase.from("subject_content").insert(insertData).select().single();
        if (data) setContent(prev => ({ ...prev, id: data.id }));
      }
      toast.success("Contenu sauvegardé !");
    } catch { toast.error("Erreur lors de la sauvegarde"); }
    setSaving(false);
  };

  const addYoutubeLink = () => {
    if (newYoutubeLink.trim()) {
      setContent(prev => ({ ...prev, youtube_links: [...prev.youtube_links, newYoutubeLink.trim()] }));
      setNewYoutubeLink("");
    }
  };

  const removeYoutubeLink = (index: number) => {
    setContent(prev => ({ ...prev, youtube_links: prev.youtube_links.filter((_, i) => i !== index) }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filePath = `${subjectId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("subject-files").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("subject-files").getPublicUrl(filePath);
      const insertData: any = {
        subject_id: subjectId, file_name: file.name, file_url: publicUrl,
        file_type: file.type, uploaded_by: user?.id,
      };
      if (isAdmin && targetStudentId !== "all") insertData.target_student_id = targetStudentId;
      await supabase.from("subject_documents").insert(insertData);
      toast.success("Fichier téléversé !");
      fetchDocuments();
    } catch { toast.error("Erreur lors du téléversement"); }
    setUploading(false);
  };

  const deleteDocument = async (doc: DocFile) => {
    await supabase.from("subject_documents").delete().eq("id", doc.id);
    toast.success("Document supprimé");
    fetchDocuments();
  };

  const canDeleteDoc = (doc: DocFile) => isAdmin || doc.uploaded_by === user?.id;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={() => setShowScrollTop((scrollRef.current?.scrollTop ?? 0) > 200)}
          className="max-h-[85vh] overflow-y-auto p-6 space-y-4"
        >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{subjectIcon}</span>
            <span>{subjectLabel}</span>
          </DialogTitle>
        </DialogHeader>

        {isAdmin && manageMode ? (
          <div className="space-y-4">
            {/* Student selector */}
            <div className="bg-secondary/30 rounded-lg p-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Élève concerné</Label>
              <Select value={targetStudentId} onValueChange={setTargetStudentId}>
                <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les élèves (contenu général)</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} ({p.school_level})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ThemeManager subjectId={subjectId} targetStudentId={targetStudentId} manageMode={true} />
          </div>
        ) : (
          /* Student/Parent view */
          <div className="space-y-6">
            {content.title && <h3 className="font-heading font-semibold text-lg">{content.title}</h3>}
            {content.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.description}</p>}

            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2"><FileText size={16} />Documents</h4>
              <div className="flex gap-2 flex-wrap">
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <Upload size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">{uploading ? "Téléversement..." : "Téléverser"}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp" />
                </label>
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <Camera size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Prendre photo</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*" capture="environment" />
                </label>
              </div>
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                    <span>{getFileIcon(doc.file_type)}</span>{doc.file_name}
                  </a>
                  {canDeleteDoc(doc) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-destructive hover:text-destructive/80 p-1"><Trash2 size={14} /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteDocument(doc)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
              {documents.length === 0 && <p className="text-sm text-muted-foreground italic">Aucun document</p>}
            </div>

            {content.youtube_links.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Youtube size={16} />Vidéos</h4>
                {content.youtube_links.map((link, i) => (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden">
                    <iframe src={getYoutubeEmbedUrl(link)} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                ))}
              </div>
            )}

            <ChapterManager subjectId={subjectId} />

            <SubjectComments subjectId={subjectId} />

            <QuizPlayer subjectId={subjectId} />

            {!content.title && !content.description && documents.length === 0 && content.youtube_links.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Aucun contenu pour cette matière</p>
            )}
          </div>
        )}
        </div>

        {/* Bouton retour en haut */}
        {showScrollTop && (
          <button
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="absolute bottom-4 right-4 z-50 bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all"
            title="Retour en haut"
          >
            <ChevronUp size={20} />
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubjectContentDialog;
