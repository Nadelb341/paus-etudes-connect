import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Quiz {
  id: string;
  title: string;
  questions?: QuizQuestion[];
}

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string;
  order_index: number;
}

const QuizManager = ({ subjectId }: { subjectId: string }) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => { fetchQuizzes(); }, [subjectId]);

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*").eq("subject_id", subjectId).order("created_at");
    if (data) setQuizzes(data);
  };

  const createQuiz = async () => {
    if (!newQuizTitle.trim()) return;
    const { data } = await supabase.from("quizzes").insert({ subject_id: subjectId, title: newQuizTitle, created_by: user?.id }).select().single();
    if (data) { setQuizzes(prev => [...prev, data]); setNewQuizTitle(""); toast.success("Quiz créé !"); }
  };

  const deleteQuiz = async (id: string) => {
    await supabase.from("quizzes").delete().eq("id", id);
    setQuizzes(prev => prev.filter(q => q.id !== id));
    if (editingQuiz?.id === id) { setEditingQuiz(null); setQuestions([]); }
    toast.success("Quiz supprimé");
  };

  const loadQuestions = async (quiz: Quiz) => {
    setEditingQuiz(quiz);
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("order_index");
    setQuestions(data || []);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correct_option: 0, explanation: "", order_index: prev.length }]);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === qIndex ? { ...q, options: q.options.map((o, j) => j === oIndex ? value : o) } : q));
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const saveQuestions = async () => {
    if (!editingQuiz) return;
    // Delete existing and re-insert
    await supabase.from("quiz_questions").delete().eq("quiz_id", editingQuiz.id);
    const inserts = questions.map((q, i) => ({
      quiz_id: editingQuiz.id,
      question: q.question,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      order_index: i,
    }));
    if (inserts.length > 0) {
      await supabase.from("quiz_questions").insert(inserts);
    }
    toast.success("Questions sauvegardées !");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={newQuizTitle} onChange={(e) => setNewQuizTitle(e.target.value)} placeholder="Titre du quiz..." className="flex-1" />
        <Button onClick={createQuiz} size="sm"><Plus size={14} className="mr-1" />Créer</Button>
      </div>

      <div className="space-y-2">
        {quizzes.map(quiz => (
          <div key={quiz.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${editingQuiz?.id === quiz.id ? "border-primary bg-primary/5" : "border-border bg-secondary/30"}`}>
            <button onClick={() => loadQuestions(quiz)} className="text-sm font-medium text-foreground hover:text-primary text-left flex-1">
              {quiz.title}
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon"><Trash2 size={14} className="text-destructive" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteQuiz(quiz.id)}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>

      {editingQuiz && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Questions — {editingQuiz.title}</h4>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addQuestion}><Plus size={14} className="mr-1" />Question</Button>
              <Button size="sm" onClick={saveQuestions} className="bg-gradient-primary"><Save size={14} className="mr-1" />Sauvegarder</Button>
            </div>
          </div>

          {questions.map((q, qIdx) => (
            <div key={qIdx} className="p-4 border border-border rounded-lg space-y-3 bg-secondary/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Question {qIdx + 1}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon"><Trash2 size={12} className="text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
                      <AlertDialogDescription>La question {qIdx + 1} sera retirée du quiz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeQuestion(qIdx)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Textarea value={q.question} onChange={(e) => updateQuestion(qIdx, "question", e.target.value)} placeholder="Question..." rows={2} />
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qIdx}`} checked={q.correct_option === oIdx} onChange={() => updateQuestion(qIdx, "correct_option", oIdx)} className="accent-primary" />
                    <Input value={opt} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} className="flex-1 text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs">Explication (affichée après réponse)</Label>
                <Textarea value={q.explanation} onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)} placeholder="Explication..." rows={2} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizManager;
