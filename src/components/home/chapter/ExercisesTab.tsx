import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { moveToTrash } from "@/lib/trash";
import { fetchExerciseSecrets, saveExerciseSecret, withSecretsForTrash } from "@/lib/exerciseSecrets";
import { saveDraft, loadDraft, clearDraft } from "@/hooks/useDraftRecovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Copy, Users, ChevronDown, ChevronUp, Eye, EyeOff, Upload, X, ClipboardCheck,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AttachedFile, Chapter, DoneEntry, Exercise, StudentProfile, blurOnEnter, getFileIcon, isImage, uploadChapterFile } from "./chapterShared";
import { RichTextEditor, RichTextView } from "./SimpleRichText";
import AttachmentViewer from "./AttachmentViewer";
import CopyExerciseDialog from "./CopyExerciseDialog";
import type { Json, TablesUpdate } from "@/integrations/supabase/types";

const DIFF_LABEL: Record<number, string> = { 1: "Facile", 2: "Moyen", 3: "Difficile" };
const Stars = ({ n, color }: { n: number; color: string }) => (
  <span className="text-xs font-semibold whitespace-nowrap" style={{ color }} title={DIFF_LABEL[n]}>
    {"★".repeat(n)}<span className="text-muted-foreground/40">{"★".repeat(3 - n)}</span>
  </span>
);

interface FormValues { title: string; statement: string; solution: string; difficulty: number; files: AttachedFile[]; }
const EMPTY: FormValues = { title: "", statement: "", solution: "", difficulty: 1, files: [] };

// ─── Formulaire commun (création ET modification) ─────────────────────────────
const ExerciseForm = ({ chapterId, initial, color, draftKey, onSubmit, onCancel, submitLabel }: {
  chapterId: string; initial: FormValues; color: string; draftKey?: string;
  onSubmit: (v: FormValues) => Promise<boolean>; onCancel: () => void; submitLabel: string;
}) => {
  const [v, setV] = useState<FormValues>(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removeFileIdx, setRemoveFileIdx] = useState<number | null>(null);

  // Brouillon automatique (création seulement)
  useEffect(() => {
    if (!draftKey) return;
    if (v.title.trim() || v.statement.trim() || v.solution.trim() || v.files.length) saveDraft(draftKey, v);
  }, [v, draftKey]);

  const addFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    if (!list.length) return;
    setUploading(true);
    try {
      const added: AttachedFile[] = [];
      for (const f of list) added.push(await uploadChapterFile(chapterId, f, "exercices"));
      setV(prev => ({ ...prev, files: [...prev.files, ...added] }));
    } catch { toast.error("Erreur lors de l'envoi du fichier"); }
    setUploading(false);
  };

  const submit = async () => {
    if (!v.title.trim()) { toast.error("Donne un titre à l'exercice"); return; }
    setSaving(true);
    const ok = await onSubmit({ ...v, title: v.title.trim() });
    setSaving(false);
    if (ok && draftKey) clearDraft(draftKey);
  };

  return (
    <div className="rounded-xl border-2 p-3 space-y-3 bg-card" style={{ borderColor: color }}>
      <div className="space-y-1">
        <Label className="text-xs">Titre</Label>
        <Input value={v.title} onChange={e => setV({ ...v, title: e.target.value })} onKeyDown={blurOnEnter}
          placeholder="Ex. : Exercice 1 — Calculer une fraction" autoFocus />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Difficulté</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(d => (
            <button key={d} type="button" onClick={() => setV({ ...v, difficulty: d })}
              className="px-3 py-1.5 rounded-full border text-xs font-medium transition-colors"
              style={v.difficulty === d ? { backgroundColor: color, borderColor: color, color: "white" } : { borderColor: color, color }}>
              {"★".repeat(d)} {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Énoncé</Label>
        <RichTextEditor value={v.statement} onChange={t => setV({ ...v, statement: t })} rows={5} placeholder="Écris la consigne de l'exercice…" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Corrigé</Label>
        <Textarea value={v.solution} onChange={e => setV({ ...v, solution: e.target.value })} rows={4} placeholder="La correction (masquée aux élèves tant que tu ne l'ouvres pas)" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Pièces jointes</Label>
        <div className="flex flex-wrap gap-1.5">
          {v.files.map((f, i) => (
            <span key={f.url + i} className="flex items-center gap-1 text-xs bg-secondary/50 rounded-full pl-2 pr-1 py-1 max-w-full">
              <span className="shrink-0">{getFileIcon(f.type, f.name)}</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">{f.name}</span>
              <button type="button" onClick={() => setRemoveFileIdx(i)} className="p-0.5 text-destructive shrink-0" aria-label="Retirer"><X size={14} /></button>
            </span>
          ))}
          <label className="flex items-center gap-1 px-3 py-1.5 border border-dashed rounded-full cursor-pointer text-xs" style={{ borderColor: color }}>
            <Upload size={12} style={{ color }} />{uploading ? "Envoi…" : "Ajouter un fichier"}
            <input type="file" multiple className="hidden" onChange={addFiles} disabled={uploading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp" />
          </label>
        </div>
      </div>
      <div className="flex gap-2 justify-end flex-wrap">
        <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
        <Button size="sm" onClick={submit} disabled={saving || uploading} style={{ backgroundColor: color }} className="text-white">
          {saving ? "Enregistrement…" : submitLabel}
        </Button>
      </div>

      <AlertDialog open={removeFileIdx !== null} onOpenChange={o => { if (!o) setRemoveFileIdx(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce fichier de l'exercice ?</AlertDialogTitle>
            <AlertDialogDescription className="[overflow-wrap:anywhere]">
              « {removeFileIdx !== null ? v.files[removeFileIdx]?.name : ""} » ne sera plus joint à l'exercice (le fichier reste gardé dans le stockage).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (removeFileIdx !== null) setV(prev => ({ ...prev, files: prev.files.filter((_, j) => j !== removeFileIdx) })); setRemoveFileIdx(null); }}>Retirer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Onglet Exercices ─────────────────────────────────────────────────────────
interface Props {
  chapter: Chapter;
  exercises: Exercise[];
  manage: boolean;
  color: string;
  levelProfiles: StudentProfile[];
  niveau: string | null;
  onChanged: () => void;
  onShareChapter: (studentId: string) => void;
}

const ExercisesTab = ({ chapter, exercises, manage, color, levelProfiles, niveau, onChanged, onShareChapter }: Props) => {
  const { user } = useAuth();
  const draftKey = `pausetude_exercise_${chapter.id}`;
  const [createInitial, setCreateInitial] = useState<FormValues | null>(null);
  const [draftRecovery, setDraftRecovery] = useState<FormValues | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openSolutions, setOpenSolutions] = useState<Record<string, boolean>>({});
  const [openGive, setOpenGive] = useState<string | null>(null);
  const [openDone, setOpenDone] = useState<string | null>(null);
  const [doneForm, setDoneForm] = useState<{ student: string; date: string; note: string }>({ student: "", date: "", note: "" });
  const [copyTarget, setCopyTarget] = useState<Exercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [viewer, setViewer] = useState<{ files: AttachedFile[]; index: number } | null>(null);

  useEffect(() => {
    if (!manage) return;
    const d = loadDraft<FormValues>(draftKey);
    if (d && (d.title?.trim() || d.statement?.trim() || d.solution?.trim() || d.files?.length)) setDraftRecovery(d);
  }, [draftKey, manage]);

  const create = async (v: FormValues) => {
    const { data: created, error } = await supabase.from("chapter_exercises").insert({
      chapter_id: chapter.id, title: v.title, statement: v.statement,
      difficulty: v.difficulty, files: v.files as unknown as Json, order_index: exercises.length, created_by: user?.id,
    }).select("id").single();
    if (error || !created) { toast.error("Impossible d'ajouter l'exercice"); return false; }
    // Le corrigé va dans la table secrète (jamais lisible par les élèves via l'API)
    if (v.solution.trim() && !(await saveExerciseSecret(created.id, { solution: v.solution }))) {
      toast.error("Exercice ajouté, mais le corrigé n'a pas pu être enregistré : ouvre « Modifier » pour le remettre");
      setCreateInitial(null);
      onChanged();
      return true;
    }
    toast.success("Exercice ajouté !");
    setCreateInitial(null);
    onChanged();
    return true;
  };

  const update = async (ex: Exercise, v: FormValues) => {
    // Corrigé d'abord (table secrète), puis l'exercice : la mise à jour de chapter_exercises
    // prévient aussi les élèves en direct quand le corrigé visible a changé
    if ((v.solution || "") !== (ex.solution || "") && !(await saveExerciseSecret(ex.id, { solution: v.solution }))) {
      toast.error("Impossible d'enregistrer le corrigé"); return false;
    }
    const { error } = await supabase.from("chapter_exercises").update({
      title: v.title, statement: v.statement, difficulty: v.difficulty,
      files: v.files as unknown as Json, updated_at: new Date().toISOString(),
    }).eq("id", ex.id);
    if (error) { toast.error("Impossible d'enregistrer"); return false; }
    toast.success("Exercice enregistré !");
    setEditingId(null);
    onChanged();
    return true;
  };

  const patch = async (ex: Exercise, values: TablesUpdate<"chapter_exercises">, okMsg?: string) => {
    const { error } = await supabase.from("chapter_exercises").update({ ...values, updated_at: new Date().toISOString() }).eq("id", ex.id);
    if (error) { toast.error("La modification a échoué"); return; }
    if (okMsg) toast.success(okMsg);
    onChanged();
  };

  const toggleStudent = (ex: Exercise, id: string) => {
    const cur = ex.target_student_ids || [];
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    patch(ex, { target_student_ids: next.length ? next : null });
  };

  const addDone = async (ex: Exercise) => {
    const p = levelProfiles.find(s => s.user_id === doneForm.student);
    if (!p || !doneForm.date) { toast.error("Choisis l'élève et la date"); return; }
    const entry: DoneEntry = { student_id: p.user_id, student_name: p.first_name, date: doneForm.date, note: doneForm.note.trim() };
    setDoneForm({ student: "", date: "", note: "" });
    setOpenDone(null);
    // Historique relu juste avant d'ajouter (pas de perte si un autre appareil a noté entre-temps)
    const current = (await fetchExerciseSecrets([ex.id])).get(ex.id)?.done_log ?? ex.done_log ?? [];
    if (!(await saveExerciseSecret(ex.id, { done_log: [...current, entry] }))) { toast.error("La modification a échoué"); return; }
    toast.success(`Noté : fait avec ${p.first_name}`);
    onChanged();
  };

  const confirmDelete = async () => {
    const ex = deleteTarget;
    setDeleteTarget(null);
    if (!ex || !user) return;
    // Copie complète pour la corbeille : la ligne + le corrigé et l'historique (table secrète)
    const { data: full } = await supabase.from("chapter_exercises").select("*").eq("id", ex.id).maybeSingle();
    const [withSecret] = await withSecretsForTrash([full || ex]);
    if (!(await moveToTrash(user.id, "chapter_exercise", ex.id, ex.title, withSecret))) {
      toast.error("La mise en corbeille a échoué : l'exercice n'a pas été supprimé"); return;
    }
    await supabase.from("chapter_exercises").delete().eq("id", ex.id);
    toast.success("Exercice mis dans la corbeille");
    onChanged();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      {manage && !createInitial && (
        <Button size="sm" variant="outline" onClick={() => setCreateInitial(EMPTY)} className="gap-1" style={{ borderColor: color, color }}>
          <Plus size={14} />Ajouter un exercice
        </Button>
      )}
      {manage && createInitial && (
        <ExerciseForm chapterId={chapter.id} initial={createInitial} color={color} draftKey={draftKey} submitLabel="Ajouter l'exercice"
          onSubmit={create} onCancel={() => { clearDraft(draftKey); setCreateInitial(null); }} />
      )}

      {exercises.length === 0 && !createInitial && (
        <div className="text-center py-6 px-3 rounded-xl border border-dashed" style={{ borderColor: color }}>
          <p className="text-2xl mb-1">✏️</p>
          <p className="text-xs text-muted-foreground">Pas encore d'exercice. Ajoute un énoncé, un corrigé et une difficulté ★ à ★★★.</p>
        </div>
      )}

      {exercises.map((ex, idx) => {
        if (manage && editingId === ex.id) {
          return (
            <ExerciseForm key={ex.id} chapterId={chapter.id} color={color} submitLabel="Enregistrer"
              initial={{ title: ex.title, statement: ex.statement, solution: ex.solution || "", difficulty: ex.difficulty, files: ex.files || [] }}
              onSubmit={v => update(ex, v)} onCancel={() => setEditingId(null)} />
          );
        }
        const given = ex.target_student_ids || [];
        const showSolution = !!openSolutions[ex.id];
        const canSeeSolution = manage || (ex.solution_visible_to_students && !!ex.solution?.trim());
        return (
          <div key={ex.id} className="rounded-xl border bg-card overflow-hidden" style={{ borderColor: color + "66" }}>
            <div className="flex items-start gap-2 p-3">
              <span className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: color }}>{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm [overflow-wrap:anywhere]">{ex.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <Stars n={ex.difficulty} color={color} />
                  <span className="text-[11px] text-muted-foreground">{DIFF_LABEL[ex.difficulty]}</span>
                  {manage && (
                    <span className="text-[11px] text-muted-foreground">
                      · {given.length ? `donné à ${given.length} élève${given.length > 1 ? "s" : ""}` : "donné à personne"}
                    </span>
                  )}
                </div>
              </div>
              {manage && (
                <>
                  <button onClick={() => setEditingId(ex.id)} className="p-1.5 rounded hover:bg-secondary/60 shrink-0" aria-label="Modifier"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(ex)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive shrink-0" aria-label="Supprimer"><Trash2 size={14} /></button>
                </>
              )}
            </div>

            <div className="px-3 pb-3 space-y-2">
              {ex.statement?.trim() && <RichTextView text={ex.statement} color={color} />}

              {(ex.files || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ex.files.map((f, i) => (
                    <button key={f.url + i} onClick={() => setViewer({ files: ex.files, index: i })}
                      className="flex items-center gap-1.5 text-xs rounded-lg border px-2 py-1.5 hover:bg-secondary/40 max-w-full" style={{ borderColor: color + "55" }}>
                      {isImage(f.type, f.name)
                        ? <img src={f.url} alt="" loading="lazy" className="w-8 h-8 rounded object-cover shrink-0" />
                        : <span className="shrink-0">{getFileIcon(f.type, f.name)}</span>}
                      <span className="min-w-0 text-left [overflow-wrap:anywhere]">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {canSeeSolution && (
                <div className="rounded-lg border border-dashed" style={{ borderColor: color }}>
                  <button className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium" style={{ color }}
                    onClick={() => setOpenSolutions(p => ({ ...p, [ex.id]: !showSolution }))}>
                    <span className="flex items-center gap-1.5">{showSolution ? <EyeOff size={13} /> : <Eye size={13} />}{showSolution ? "Masquer le corrigé" : "Voir le corrigé"}</span>
                    {showSolution ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {showSolution && (
                    <div className="px-3 pb-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {ex.solution?.trim() ? ex.solution : <span className="italic text-muted-foreground text-xs">Pas encore de corrigé.</span>}
                    </div>
                  )}
                </div>
              )}

              {manage && (
                <>
                  <label className="flex items-center justify-between gap-2 text-xs px-1 cursor-pointer">
                    <span className="min-w-0">Corrigé visible par les élèves à qui l'exercice est donné</span>
                    <Switch checked={ex.solution_visible_to_students}
                      onCheckedChange={c => patch(ex, { solution_visible_to_students: c }, c ? "Corrigé visible par les élèves" : "Corrigé masqué aux élèves")} />
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setOpenGive(openGive === ex.id ? null : ex.id)}>
                      <Users size={13} />Donner à un élève
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setCopyTarget(ex)}>
                      <Copy size={13} />Copier vers…
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1"
                      onClick={() => { setOpenDone(openDone === ex.id ? null : ex.id); setDoneForm({ student: "", date: today, note: "" }); }}>
                      <ClipboardCheck size={13} />Noter fait avec…
                    </Button>
                  </div>

                  {openGive === ex.id && (
                    <div className="rounded-lg bg-secondary/30 p-2 space-y-0.5">
                      {levelProfiles.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-1">Aucun élève {niveau ? `en ${niveau}` : ""}</p>
                      ) : levelProfiles.map(p => {
                        const on = given.includes(p.user_id);
                        const chapterShared = (chapter.target_student_ids || []).includes(p.user_id);
                        return (
                          <div key={p.user_id} className="space-y-0.5">
                            <label className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-secondary/50">
                              <Checkbox checked={on} onCheckedChange={() => toggleStudent(ex, p.user_id)} />
                              <span className="font-medium">{p.first_name}</span>
                            </label>
                            {on && !chapterShared && (
                              <div className="flex flex-wrap items-center gap-2 pl-8 pb-1 text-[11px] text-amber-700 dark:text-amber-400">
                                <span>⚠️ Le chapitre n'est pas encore partagé avec {p.first_name} : il ne verra pas l'exercice.</span>
                                <button className="underline font-medium" onClick={() => onShareChapter(p.user_id)}>Partager aussi le chapitre</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {openDone === ex.id && (
                    <div className="rounded-lg bg-secondary/30 p-2 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={doneForm.student} onChange={e => setDoneForm({ ...doneForm, student: e.target.value })}>
                          <option value="">Choisir l'élève</option>
                          {levelProfiles.map(p => <option key={p.user_id} value={p.user_id}>{p.first_name}</option>)}
                        </select>
                        <Input type="date" className="h-9" value={doneForm.date} onChange={e => setDoneForm({ ...doneForm, date: e.target.value })} />
                      </div>
                      <Input className="h-9" placeholder="Note courte (ex. : réussi, à revoir…)" value={doneForm.note}
                        onChange={e => setDoneForm({ ...doneForm, note: e.target.value })}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addDone(ex); } }} />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setOpenDone(null)}>Annuler</Button>
                        <Button size="sm" className="h-8 text-white" style={{ backgroundColor: color }} onClick={() => addDone(ex)}>Enregistrer</Button>
                      </div>
                    </div>
                  )}

                  {(ex.done_log || []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-muted-foreground">Historique (visible par toi seule)</p>
                      {[...(ex.done_log || [])].sort((a, b) => b.date.localeCompare(a.date)).map((d, i) => (
                        <p key={i} className="text-xs [overflow-wrap:anywhere]">
                          ✅ {new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR")} — <span className="font-medium">{d.student_name}</span>{d.note ? ` : ${d.note}` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      <AttachmentViewer files={viewer?.files || []} index={viewer ? viewer.index : null} onClose={() => setViewer(null)} />
      <CopyExerciseDialog exercise={copyTarget} onClose={() => setCopyTarget(null)} defaultLevel={niveau} />

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet exercice ?</AlertDialogTitle>
            <AlertDialogDescription className="[overflow-wrap:anywhere]">
              « {deleteTarget?.title} » ira dans la corbeille (Paramètres), d'où tu pourras le restaurer.
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
              Tu as commencé à créer l'exercice « {draftRecovery?.title || "sans titre"} ». Souhaites-tu continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { clearDraft(draftKey); setDraftRecovery(null); }}>Supprimer</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCreateInitial(draftRecovery); setDraftRecovery(null); }}>Continuer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExercisesTab;
