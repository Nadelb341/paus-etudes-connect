import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AttachedFile, isImage } from "./chapterShared";

interface Props {
  files: AttachedFile[];
  index: number | null;
  onClose: () => void;
}

/** Aperçu agrandi dans l'appli (image, PDF, Office), défilable ← → quand il y a plusieurs fichiers. */
const AttachmentViewer = ({ files, index, onClose }: Props) => {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const open = index !== null && files.length > 0;
  const many = files.length > 1;

  useEffect(() => { if (index !== null) setI(index); }, [index]);

  const go = (d: number) => setI(prev => (prev + d + files.length) % files.length);

  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, many, files.length]);

  if (!open) return null;
  const f = files[Math.min(i, files.length - 1)];
  const lower = f.name.toLowerCase();
  const isPdf = f.type.includes("pdf") || lower.endsWith(".pdf");
  const isOffice = /\.(docx?|xlsx?|pptx?)$/.test(lower);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl w-[96vw] p-3 sm:p-4">
        <DialogHeader>
          <DialogTitle className="text-sm pr-8 [overflow-wrap:anywhere]">{f.name}</DialogTitle>
        </DialogHeader>
        <div
          className="relative flex items-center justify-center bg-secondary/30 rounded-lg overflow-hidden min-h-[50vh]"
          onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (!many || touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          {isImage(f.type, f.name) ? (
            <img src={f.url} alt={f.name} className="max-h-[70vh] max-w-full object-contain" />
          ) : isPdf ? (
            <iframe src={f.url} title={f.name} className="w-full h-[70vh] bg-white" />
          ) : isOffice ? (
            <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(f.url)}`} title={f.name} className="w-full h-[70vh] bg-white" />
          ) : (
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm p-6">Ouvrir le fichier</a>
          )}
          {many && (
            <>
              <button onClick={() => go(-1)} aria-label="Précédent"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 shadow flex items-center justify-center">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => go(1)} aria-label="Suivant"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 shadow flex items-center justify-center">
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
        {many && <p className="text-center text-xs text-muted-foreground">{i + 1} / {files.length}</p>}
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentViewer;
