import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { moveToTrash } from "@/lib/trash";
import { saveDraft, loadDraft, clearDraft } from "@/hooks/useDraftRecovery";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, RotateCw, Shuffle, List } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Flashcard } from "./chapterShared";

interface CardValues { front: string; back: string; }

const CardForm = ({ initial, color, draftKey, submitLabel, onSubmit, onCancel }: {
  initial: CardValues; color: string; draftKey?: string; submitLabel: string;
  onSubmit: (v: CardValues) => Promise<boolean>; onCancel: () => void;
}) => {
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const backRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (draftKey && (v.front.trim() || v.back.trim())) saveDraft(draftKey, v);
  }, [v, draftKey]);

  const submit = async () => {
    if (!v.front.trim() || !v.back.trim()) { toast.error("Remplis le recto et le verso"); return; }
    setSaving(true);
    const ok = await onSubmit({ front: v.front.trim(), back: v.back.trim() });
    setSaving(false);
    if (ok) {
      if (draftKey) clearDraft(draftKey);
      setV({ front: "", back: "" });
    }
  };

  return (
    <div className="rounded-xl border-2 p-3 space-y-2 bg-card" style={{ borderColor: color }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Recto (question)</Label>
          <Textarea rows={3} value={v.front} autoFocus onChange={e => setV({ ...v, front: e.target.value })}
            placeholder="Ex. : Qu'est-ce qu'un nombre premier ?"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); backRef.current?.focus(); } }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Verso (réponse)</Label>
          <Textarea ref={backRef} rows={3} value={v.back} onChange={e => setV({ ...v, back: e.target.value })}
            placeholder="Ex. : Un nombre qui n'a que deux diviseurs : 1 et lui-même."
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Entrée = valider · Maj + Entrée = aller à la ligne</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>{draftKey ? "Fermer" : "Annuler"}</Button>
        <Button size="sm" className="text-white" style={{ backgroundColor: color }} disabled={saving} onClick={submit}>{submitLabel}</Button>
      </div>
    </div>
  );
};

// ─── Mode révision : carte qui se retourne, ← → ───────────────────────────────
const ReviewMode = ({ cards, color }: { cards: Flashcard[]; color: string }) => {
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const touchX = useRef<number | null>(null);

  const nCards = cards.length;
  useEffect(() => { setOrder(Array.from({ length: nCards }, (_, i) => i)); setPos(p => Math.min(p, Math.max(nCards - 1, 0))); }, [nCards]);

  const go = (d: number) => { setFlipped(false); setPos(p => (p + d + order.length) % order.length); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === " ") { e.preventDefault(); setFlipped(f => !f); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.length]);

  if (!cards.length) return null;
  const card = cards[order[pos] ?? 0];
  if (!card) return null;

  return (
    <div className="space-y-3">
      <div
        className="relative w-full h-56 sm:h-64 cursor-pointer select-none [perspective:1000px]"
        onClick={() => setFlipped(f => !f)}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
          <div className="absolute inset-0 rounded-2xl border-2 bg-card flex flex-col items-center justify-center p-5 text-center [backface-visibility:hidden] overflow-hidden"
            style={{ borderColor: color }}>
            <span className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color }}>Question</span>
            <p className="text-base sm:text-lg font-semibold whitespace-pre-wrap [overflow-wrap:anywhere] overflow-y-auto">{card.front}</p>
            <span className="absolute bottom-2 text-[10px] text-muted-foreground flex items-center gap-1"><RotateCw size={10} />Touche la carte pour la retourner</span>
          </div>
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] text-white overflow-hidden"
            style={{ backgroundColor: color }}>
            <span className="text-[10px] uppercase tracking-widest font-bold mb-2 opacity-80">Réponse</span>
            <p className="text-base sm:text-lg font-medium whitespace-pre-wrap [overflow-wrap:anywhere] overflow-y-auto">{card.back}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Carte précédente"><ChevronLeft size={18} /></Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{pos + 1} / {order.length}</span>
          <button className="p-1.5 rounded hover:bg-secondary/60" title="Mélanger" aria-label="Mélanger les cartes"
            onClick={() => { setOrder(o => [...o].sort(() => Math.random() - 0.5)); setPos(0); setFlipped(false); }}>
            <Shuffle size={15} />
          </button>
        </div>
        <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Carte suivante"><ChevronRight size={18} /></Button>
      </div>
    </div>
  );
};

// ─── Onglet Flashcards ────────────────────────────────────────────────────────
interface Props {
  chapterId: string;
  cards: Flashcard[];
  manage: boolean;
  color: string;
  onChanged: () => void;
}

const FlashcardsTab = ({ chapterId, cards, manage, color, onChanged }: Props) => {
  const { user } = useAuth();
  const draftKey = `pausetude_flashcard_${chapterId}`;
  const [mode, setMode] = useState<"review" | "list">(manage ? "list" : "review");
  const [createInitial, setCreateInitial] = useState<CardValues | null>(null);
  const [draftRecovery, setDraftRecovery] = useState<CardValues | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Flashcard | null>(null);

  useEffect(() => {
    if (!manage) return;
    const d = loadDraft<CardValues>(draftKey);
    if (d && (d.front?.trim() || d.back?.trim())) setDraftRecovery(d);
  }, [draftKey, manage]);

  const create = async (v: CardValues) => {
    const { error } = await supabase.from("chapter_flashcards").insert({
      chapter_id: chapterId, front: v.front, back: v.back, order_index: cards.length, created_by: user?.id,
    });
    if (error) { toast.error("Impossible d'ajouter la carte"); return false; }
    toast.success("Carte ajoutée — tu peux en écrire une autre");
    onChanged();
    return true;
  };

  const update = async (c: Flashcard, v: CardValues) => {
    const { error } = await supabase.from("chapter_flashcards").update({ front: v.front, back: v.back }).eq("id", c.id);
    if (error) { toast.error("Impossible d'enregistrer"); return false; }
    toast.success("Carte enregistrée !");
    setEditingId(null);
    onChanged();
    return true;
  };

  const confirmDelete = async () => {
    const c = deleteTarget;
    setDeleteTarget(null);
    if (!c || !user) return;
    await moveToTrash(user.id, "chapter_flashcard", c.id, `Flashcard : ${c.front.slice(0, 60)}`, c);
    await supabase.from("chapter_flashcards").delete().eq("id", c.id);
    toast.success("Carte mise dans la corbeille");
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {cards.length > 0 && (
          <div className="flex rounded-full border overflow-hidden text-xs" style={{ borderColor: color }}>
            <button className="px-3 py-1.5 flex items-center gap-1" onClick={() => setMode("review")}
              style={mode === "review" ? { backgroundColor: color, color: "white" } : { color }}>
              <RotateCw size={12} />Réviser
            </button>
            <button className="px-3 py-1.5 flex items-center gap-1" onClick={() => setMode("list")}
              style={mode === "list" ? { backgroundColor: color, color: "white" } : { color }}>
              <List size={12} />Toutes les cartes
            </button>
          </div>
        )}
        {manage && !createInitial && (
          <Button size="sm" variant="outline" className="gap-1 h-8" style={{ borderColor: color, color }}
            onClick={() => { setCreateInitial({ front: "", back: "" }); setMode("list"); }}>
            <Plus size={14} />Ajouter une carte
          </Button>
        )}
      </div>

      {manage && createInitial && (
        <CardForm initial={createInitial} color={color} draftKey={draftKey} submitLabel="Ajouter la carte"
          onSubmit={create} onCancel={() => { clearDraft(draftKey); setCreateInitial(null); }} />
      )}

      {cards.length === 0 && !createInitial && (
        <div className="text-center py-6 px-3 rounded-xl border border-dashed" style={{ borderColor: color }}>
          <p className="text-2xl mb-1">🃏</p>
          <p className="text-xs text-muted-foreground">Pas encore de flashcard. Une question au recto, la réponse au verso : idéal pour apprendre par cœur.</p>
        </div>
      )}

      {mode === "review" && cards.length > 0 && <ReviewMode cards={cards} color={color} />}

      {mode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {cards.map(c => editingId === c.id && manage ? (
            <div key={c.id} className="md:col-span-2">
              <CardForm initial={{ front: c.front, back: c.back }} color={color} submitLabel="Enregistrer"
                onSubmit={v => update(c, v)} onCancel={() => setEditingId(null)} />
            </div>
          ) : (
            <div key={c.id} className="rounded-xl border bg-card overflow-hidden flex items-start gap-2 p-3" style={{ borderColor: color + "66" }}>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold whitespace-pre-wrap [overflow-wrap:anywhere]">{c.front}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap [overflow-wrap:anywhere]">↳ {c.back}</p>
              </div>
              {manage && (
                <>
                  <button onClick={() => setEditingId(c.id)} className="p-1.5 rounded hover:bg-secondary/60 shrink-0" aria-label="Modifier"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive shrink-0" aria-label="Supprimer"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette flashcard ?</AlertDialogTitle>
            <AlertDialogDescription className="[overflow-wrap:anywhere]">
              « {deleteTarget?.front} » ira dans la corbeille (Paramètres), d'où tu pourras la restaurer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!draftRecovery}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⏳ Action inachevée</AlertDialogTitle>
            <AlertDialogDescription className="[overflow-wrap:anywhere]">
              Tu as commencé à créer la flashcard « {draftRecovery?.front || "sans question"} ». Souhaites-tu continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { clearDraft(draftKey); setDraftRecovery(null); }}>Supprimer</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCreateInitial(draftRecovery); setDraftRecovery(null); setMode("list"); }}>Continuer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlashcardsTab;
