import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSubjectsForLevel, levelSubjectId } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ALL_LEVELS, Exercise } from "./chapterShared";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  exercise: Exercise | null;
  onClose: () => void;
  defaultLevel?: string | null;
}

const selectCls = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm";
const NO_THEME = "__sans_theme__";

/** « Copier vers… » : niveau → matière → thème → chapitre. Copie énoncé, corrigé, fichiers et difficulté. */
const CopyExerciseDialog = ({ exercise, onClose, defaultLevel }: Props) => {
  const { user } = useAuth();
  const [level, setLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [themes, setThemes] = useState<{ id: string; title: string }[]>([]);
  const [theme, setTheme] = useState("");
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([]);
  const [chapter, setChapter] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (exercise) { setLevel(defaultLevel || ""); setSubject(""); setTheme(""); setChapter(""); }
  }, [exercise, defaultLevel]);

  const compositeSubject = level && subject ? levelSubjectId(subject, level) : "";

  useEffect(() => {
    setThemes([]); setTheme(""); setChapters([]); setChapter("");
    if (!compositeSubject) return;
    supabase.from("subject_themes").select("id, title").eq("subject_id", compositeSubject).order("order_index")
      .then(({ data }) => setThemes(data || []));
  }, [compositeSubject]);

  useEffect(() => {
    setChapters([]); setChapter("");
    if (!compositeSubject || !theme) return;
    let q = supabase.from("subject_chapters").select("id, title").eq("subject_id", compositeSubject).order("order_index");
    q = theme === NO_THEME ? q.is("theme_id", null) : q.eq("theme_id", theme);
    q.then(({ data }) => setChapters(data || []));
  }, [compositeSubject, theme]);

  const doCopy = async () => {
    if (!exercise || !chapter) return;
    setSaving(true);
    const { count } = await supabase.from("chapter_exercises").select("id", { count: "exact", head: true }).eq("chapter_id", chapter);
    const { error } = await supabase.from("chapter_exercises").insert({
      chapter_id: chapter,
      title: exercise.title,
      statement: exercise.statement,
      solution: exercise.solution || "",
      difficulty: exercise.difficulty,
      files: exercise.files as unknown as Json,
      order_index: count ?? 0,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error("La copie a échoué"); return; }
    const chTitle = chapters.find(c => c.id === chapter)?.title || "";
    toast.success(`Exercice copié dans « ${chTitle} »`);
    onClose();
  };

  const subjects = level ? getSubjectsForLevel(level) : [];

  return (
    <Dialog open={!!exercise} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 [overflow-wrap:anywhere]">Copier « {exercise?.title} » vers…</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">1. Niveau</Label>
            <select className={selectCls} value={level} onChange={e => { setLevel(e.target.value); setSubject(""); }}>
              <option value="">Choisir un niveau</option>
              {ALL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">2. Matière</Label>
            <select className={selectCls} value={subject} onChange={e => setSubject(e.target.value)} disabled={!level}>
              <option value="">Choisir une matière</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">3. Grand thème</Label>
            <select className={selectCls} value={theme} onChange={e => setTheme(e.target.value)} disabled={!subject}>
              <option value="">{subject && themes.length === 0 ? "Aucun thème" : "Choisir un thème"}</option>
              {themes.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              {subject && <option value={NO_THEME}>📁 Chapitres sans thème</option>}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">4. Chapitre</Label>
            <select className={selectCls} value={chapter} onChange={e => setChapter(e.target.value)} disabled={!theme}>
              <option value="">{theme && chapters.length === 0 ? "Aucun chapitre ici" : "Choisir un chapitre"}</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-muted-foreground">La copie n'est donnée à aucun élève : tu choisiras ensuite à qui la donner.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={doCopy} disabled={!chapter || saving}>{saving ? "Copie…" : "Copier ici"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CopyExerciseDialog;
