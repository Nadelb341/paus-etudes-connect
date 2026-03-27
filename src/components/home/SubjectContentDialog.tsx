import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { toast } from "sonner";
import { Upload, Link, Trash2, FileText, Youtube, Plus, X } from "lucide-react";
import QuizManager from "./QuizManager";
import QuizPlayer from "./QuizPlayer";

interface SubjectContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectLabel: string;
  subjectIcon: string;
  subjectColor: string;
  manageMode?: boolean;
}

interface ContentData {
  id?: string;
  title: string;
  description: string;
  youtube_links: string[];
}

interface DocFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

const SubjectContentDialog = ({ open, onOpenChange, subjectId, subjectLabel, subjectIcon, subjectColor, manageMode }: SubjectContentDialogProps) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [content, setContent] = useState<ContentData>({ title: "", description: "", youtube_links: [] });
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [newYoutubeLink, setNewYoutubeLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  useEffect(() => {
    if (open) {
      fetchContent();
      fetchDocuments();
    }
  }, [open, subjectId]);

  const fetchContent = async () => {
    const { data } = await supabase
      .from("subject_content")
      .select("*")
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (data) {
      setContent({ id: data.id, title: data.title || "", description: data.description || "", youtube_links: data.youtube_links || [] });
    }
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from("subject_documents")
      .select("*")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });
    if (data) setDocuments(data);
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      if (content.id) {
        await supabase.from("subject_content").update({
          title: content.title,
          description: content.description,
          youtube_links: content.youtube_links,
          updated_at: new Date().toISOString(),
        }).eq("id", content.id);
      } else {
        const { data } = await supabase.from("subject_content").insert({
          subject_id: subjectId,
          title: content.title,
          description: content.description,
          youtube_links: content.youtube_links,
          created_by: user?.id,
        }).select().single();
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
      await supabase.from("subject_documents").insert({
        subject_id: subjectId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        uploaded_by: user?.id,
      });
      toast.success("Fichier téléversé !");
      fetchDocuments();
    } catch { toast.error("Erreur lors du téléversement"); }
    setUploading(false);
  };

  const deleteDocument = async (doc: DocFile) => {
    if (!confirm("Supprimer ce document ?")) return;
    await supabase.from("subject_documents").delete().eq("id", doc.id);
    toast.success("Document supprimé");
    fetchDocuments();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{subjectIcon}</span>
            <span>{subjectLabel}</span>
          </DialogTitle>
        </DialogHeader>

        {isAdmin && manageMode ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Contenu</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="videos">Vidéos</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div>
                <Label>Titre</Label>
                <Input value={content.title} onChange={(e) => setContent(prev => ({ ...prev, title: e.target.value }))} placeholder="Titre du contenu..." />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={content.description} onChange={(e) => setContent(prev => ({ ...prev, description: e.target.value }))} placeholder="Description..." rows={5} />
              </div>
              <Button onClick={saveContent} disabled={saving} className="bg-gradient-primary">
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              <div>
                <Label>Téléverser un document (PDF, Image, Word, Excel...)</Label>
                <div className="mt-2">
                  <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                    <Upload size={18} className="text-primary" />
                    <span className="text-sm text-muted-foreground">{uploading ? "Téléversement..." : "Choisir un fichier"}</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp" />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-foreground hover:text-primary">
                      <span>{getFileIcon(doc.file_type)}</span>
                      {doc.file_name}
                    </a>
                    <Button variant="ghost" size="icon" onClick={() => deleteDocument(doc)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                ))}
                {documents.length === 0 && <p className="text-sm text-muted-foreground italic">Aucun document</p>}
              </div>
            </TabsContent>

            <TabsContent value="videos" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Input value={newYoutubeLink} onChange={(e) => setNewYoutubeLink(e.target.value)} placeholder="Lien YouTube..." className="flex-1" />
                <Button onClick={addYoutubeLink} size="icon"><Plus size={16} /></Button>
              </div>
              <div className="space-y-2">
                {content.youtube_links.map((link, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm truncate flex-1">
                      <Youtube size={14} className="text-destructive shrink-0" />
                      <span className="truncate">{link}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeYoutubeLink(i)}>
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button onClick={saveContent} disabled={saving} className="bg-gradient-primary">
                {saving ? "Sauvegarde..." : "Sauvegarder les liens"}
              </Button>
            </TabsContent>

            <TabsContent value="quiz" className="mt-4">
              <QuizManager subjectId={subjectId} />
            </TabsContent>
          </Tabs>
        ) : (
          /* Student view */
          <div className="space-y-6">
            {content.title && <h3 className="font-heading font-semibold text-lg">{content.title}</h3>}
            {content.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.description}</p>}

            {documents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2"><FileText size={16} />Documents</h4>
                {documents.map(doc => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg text-sm hover:bg-secondary/50 transition-colors">
                    <span>{getFileIcon(doc.file_type)}</span>{doc.file_name}
                  </a>
                ))}
              </div>
            )}

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

            <QuizPlayer subjectId={subjectId} />

            {!content.title && !content.description && documents.length === 0 && content.youtube_links.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Aucun contenu pour cette matière</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubjectContentDialog;
