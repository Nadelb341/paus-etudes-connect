import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { moveToTrash } from "@/lib/trash";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Camera, MoreHorizontal, Pencil, RefreshCw, Trash2, Check, X, ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChapterDoc, getFileIcon, isImage, uploadChapterFile } from "./chapterShared";
import AttachmentViewer from "./AttachmentViewer";

interface Props {
  chapterId: string;
  category: "document" | "fiche";
  docs: ChapterDoc[];
  manage: boolean;
  color: string;
  onChanged: () => void;
}

const DocumentsTab = ({ chapterId, category, docs, manage, color, onChanged }: Props) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChapterDoc | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<ChapterDoc | null>(null);

  const isFiche = category === "fiche";
  const files = docs.map(d => ({ name: d.file_name, url: d.file_url, type: d.file_type || "" }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    if (!list.length) return;
    setUploading(true);
    try {
      for (const original of list) {
        const f = await uploadChapterFile(chapterId, original);
        const { error } = await supabase.from("chapter_documents").insert({
          chapter_id: chapterId, file_name: f.name, file_url: f.url, file_type: f.type,
          uploaded_by: user?.id, category,
        });
        if (error) throw error;
      }
      toast.success(list.length > 1 ? "Fichiers ajoutés !" : "Fichier ajouté !");
      onChanged();
    } catch {
      toast.error("Erreur lors de l'envoi du fichier");
    }
    setUploading(false);
  };

  const saveRename = async (doc: ChapterDoc) => {
    const name = renameValue.trim();
    if (!name) return;
    const { error } = await supabase.from("chapter_documents").update({ file_name: name }).eq("id", doc.id);
    if (error) { toast.error("Impossible de renommer"); return; }
    setRenamingId(null);
    toast.success("Document renommé !");
    onChanged();
  };

  // Nouvelle version : l'ancienne ligne part dans la corbeille (restaurable), la nouvelle prend sa place
  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = "";
    const old = replaceTarget;
    setReplaceTarget(null);
    if (!original || !old || !user) return;
    setUploading(true);
    try {
      const f = await uploadChapterFile(chapterId, original);
      const oldBase = old.file_name.replace(/\.[^.]+$/, "");
      const newExt = (f.name.match(/\.[^.]+$/) || [""])[0];
      const { error } = await supabase.from("chapter_documents").insert({
        chapter_id: chapterId, file_name: oldBase + newExt, file_url: f.url, file_type: f.type,
        uploaded_by: user.id, category: old.category || category,
      });
      if (error) throw error;
      await moveToTrash(user.id, "chapter_document", old.id, `${old.file_name} (ancienne version)`, old);
      await supabase.from("chapter_documents").delete().eq("id", old.id);
      toast.success("Nouvelle version enregistrée — l'ancienne est dans la corbeille");
      onChanged();
    } catch {
      toast.error("Erreur lors du remplacement");
    }
    setUploading(false);
  };

  const moveCategory = async (doc: ChapterDoc) => {
    const next = doc.category === "fiche" ? "document" : "fiche";
    const { error } = await supabase.from("chapter_documents").update({ category: next }).eq("id", doc.id);
    if (error) { toast.error("Impossible de déplacer"); return; }
    toast.success(next === "fiche" ? "Déplacé dans « Fiches visuelles »" : "Déplacé dans « Documents »");
    onChanged();
  };

  const confirmDelete = async () => {
    const doc = deleteTarget;
    setDeleteTarget(null);
    if (!doc || !user) return;
    await moveToTrash(user.id, "chapter_document", doc.id, doc.file_name, doc);
    await supabase.from("chapter_documents").delete().eq("id", doc.id);
    toast.success("Document mis dans la corbeille");
    onChanged();
  };

  // Modifier / remplacer / supprimer : enseignante seulement (les élèves n'ont pas le droit de modifier en base)
  const canEditDoc = (_doc: ChapterDoc) => manage;

  const docMenu = (doc: ChapterDoc) => canEditDoc(doc) && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded hover:bg-secondary/60 shrink-0" aria-label="Options du document">
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { setRenamingId(doc.id); setRenameValue(doc.file_name); }}>
          <Pencil size={14} className="mr-2" />Renommer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setReplaceTarget(doc); setTimeout(() => replaceInput.current?.click(), 0); }}>
          <RefreshCw size={14} className="mr-2" />Remplacer par une nouvelle version
        </DropdownMenuItem>
        {manage && (
          <DropdownMenuItem onClick={() => moveCategory(doc)}>
            <ArrowRightLeft size={14} className="mr-2" />
            {doc.category === "fiche" ? "Déplacer dans « Documents »" : "Déplacer dans « Fiches visuelles »"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(doc)}>
          <Trash2 size={14} className="mr-2" />Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renameRow = (doc: ChapterDoc) => (
    <div className="flex items-center gap-1.5 w-full">
      <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus className="h-8 text-xs flex-1 min-w-0"
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveRename(doc); } if (e.key === "Escape") setRenamingId(null); }} />
      <button onClick={() => saveRename(doc)} className="p-1 text-green-600 shrink-0" aria-label="Valider"><Check size={16} /></button>
      <button onClick={() => setRenamingId(null)} className="p-1 text-destructive shrink-0" aria-label="Annuler"><X size={16} /></button>
    </div>
  );

  return (
    <div className="space-y-3">
      {manage && (
        <div className="flex gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed rounded-lg cursor-pointer text-xs hover:bg-secondary/30" style={{ borderColor: color }}>
            <Upload size={14} style={{ color }} />
            <span>{uploading ? "Envoi…" : isFiche ? "Ajouter une fiche (image ou PDF)" : "Téléverser"}</span>
            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading}
              accept={isFiche ? ".pdf,.jpg,.jpeg,.png,.gif,.webp" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"} />
          </label>
          <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed rounded-lg cursor-pointer text-xs hover:bg-secondary/30" style={{ borderColor: color }}>
            <Camera size={14} style={{ color }} />
            <span>Photo</span>
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*" capture="environment" />
          </label>
        </div>
      )}
      <input ref={replaceInput} type="file" className="hidden" onChange={handleReplace}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp" />

      {docs.length === 0 && (
        <div className="text-center py-6 px-3 rounded-xl border border-dashed" style={{ borderColor: color }}>
          <p className="text-2xl mb-1">{isFiche ? "🖼️" : "📄"}</p>
          <p className="text-xs text-muted-foreground">
            {isFiche ? "Pas encore de fiche visuelle. Ajoute une carte mentale, un schéma ou une fiche en image." : "Pas encore de document. Ajoute un cours en PDF, une fiche ou une photo."}
          </p>
        </div>
      )}

      {isFiche ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {docs.map((doc, i) => (
            <div key={doc.id} className="rounded-lg border overflow-hidden bg-card min-w-0" style={{ borderColor: color + "55" }}>
              <button className="block w-full aspect-[4/3] bg-secondary/30" onClick={() => setViewIndex(i)}>
                {isImage(doc.file_type, doc.file_name)
                  ? <img src={doc.file_url} alt={doc.file_name} loading="lazy" className="w-full h-full object-cover" />
                  : <span className="flex items-center justify-center h-full text-4xl">{getFileIcon(doc.file_type, doc.file_name)}</span>}
              </button>
              <div className="flex items-start gap-1 p-1.5">
                {renamingId === doc.id ? renameRow(doc) : (
                  <>
                    <span className="text-xs flex-1 min-w-0 [overflow-wrap:anywhere]">{doc.file_name}</span>
                    {docMenu(doc)}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map((doc, i) => (
            <div key={doc.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg text-xs overflow-hidden">
              {renamingId === doc.id ? renameRow(doc) : (
                <>
                  <button onClick={() => setViewIndex(i)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left hover:text-primary">
                    <span className="shrink-0">{getFileIcon(doc.file_type, doc.file_name)}</span>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{doc.file_name}</span>
                  </button>
                  {docMenu(doc)}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <AttachmentViewer files={files} index={viewIndex} onClose={() => setViewIndex(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription className="[overflow-wrap:anywhere]">
              « {deleteTarget?.file_name} » ira dans la corbeille (Paramètres), d'où tu pourras le restaurer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsTab;
