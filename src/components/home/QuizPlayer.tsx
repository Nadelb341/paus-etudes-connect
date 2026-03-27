import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ENCOURAGEMENT_MESSAGES } from "@/lib/constants";
import { CheckCircle2, XCircle, HelpCircle, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Quiz { id: string; title: string; }
interface Question { id: string; question: string; options: string[]; correct_option: number; explanation: string; order_index: number; }
interface Response { question_id: string; selected_option: number; is_correct: boolean; attempts: number; }

const QuizPlayer = ({ subjectId }: { subjectId: string }) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [encouragement, setEncouragement] = useState("");
  const [responseCounts, setResponseCounts] = useState<Record<number, number>>({});
  const [userResponses, setUserResponses] = useState<Record<string, Response>>({});

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("subject_id", subjectId);
      if (data?.length) setQuizzes(data);
    };
    fetchQuizzes();
  }, [subjectId]);

  const startQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    const { data: qs } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("order_index");
    if (qs) {
      setQuestions(qs);
      // Load user's existing responses
      const { data: existingResponses } = await supabase.from("quiz_responses").select("*").eq("user_id", user?.id);
      const respMap: Record<string, Response> = {};
      existingResponses?.forEach(r => { respMap[r.question_id] = r; });
      setUserResponses(respMap);
      setCurrentIndex(0);
      resetQuestion();
    }
  };

  const resetQuestion = () => {
    setAttempts(0); setAnswered(false); setSelectedOption(null); setIsCorrect(false);
    setShowExplanation(false); setEncouragement(""); setResponseCounts({});
  };

  const fetchResponseCounts = async (questionId: string) => {
    const { data } = await supabase.from("quiz_responses").select("selected_option").eq("question_id", questionId);
    const counts: Record<number, number> = {};
    data?.forEach(r => { counts[r.selected_option] = (counts[r.selected_option] || 0) + 1; });
    setResponseCounts(counts);
  };

  const handleAnswer = async (optionIndex: number) => {
    if (answered) return;
    const question = questions[currentIndex];
    const correct = optionIndex === question.correct_option;
    setSelectedOption(optionIndex);

    if (correct) {
      setIsCorrect(true);
      setAnswered(true);
      // Save response
      await supabase.from("quiz_responses").upsert({
        question_id: question.id, user_id: user?.id, selected_option: optionIndex,
        is_correct: true, attempts: attempts + 1, answered_at: new Date().toISOString(),
      }, { onConflict: "question_id,user_id" });
      fetchResponseCounts(question.id);
      setShowExplanation(true);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setAnswered(true);
        setIsCorrect(false);
        await supabase.from("quiz_responses").upsert({
          question_id: question.id, user_id: user?.id, selected_option: optionIndex,
          is_correct: false, attempts: 3, answered_at: new Date().toISOString(),
        }, { onConflict: "question_id,user_id" });
        fetchResponseCounts(question.id);
        setShowExplanation(true);
      } else {
        const msg = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
        setEncouragement(msg);
        setTimeout(() => { setSelectedOption(null); setEncouragement(""); }, 1500);
      }
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetQuestion();
    }
  };

  if (quizzes.length === 0) return null;

  if (!selectedQuiz) {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2"><HelpCircle size={16} />Quiz disponibles</h4>
        {quizzes.map(q => (
          <Button key={q.id} variant="outline" className="w-full justify-start" onClick={() => startQuiz(q)}>
            {q.title}
          </Button>
        ))}
      </div>
    );
  }

  if (questions.length === 0) return <p className="text-sm text-muted-foreground">Ce quiz n'a pas encore de questions.</p>;

  const question = questions[currentIndex];
  const alreadyAnswered = userResponses[question.id];
  const totalResponses = Object.values(responseCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{selectedQuiz.title}</h4>
        <span className="text-xs text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
          <p className="font-medium text-sm">{question.question}</p>

          <div className="space-y-2">
            {question.options.map((opt, i) => {
              let variant = "outline" as const;
              let extraClass = "";
              if (answered || selectedOption === i) {
                if (i === question.correct_option) extraClass = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300";
                else if (selectedOption === i && !isCorrect) extraClass = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={answered}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${extraClass || "border-border hover:border-primary hover:bg-primary/5"} ${answered ? "cursor-default" : "cursor-pointer"}`}>
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {answered && totalResponses > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BarChart3 size={12} />{responseCounts[i] || 0} ({totalResponses > 0 ? Math.round(((responseCounts[i] || 0) / totalResponses) * 100) : 0}%)
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {encouragement && (
            <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-sm text-primary font-medium text-center p-2 bg-primary/10 rounded-lg">
              {encouragement}
            </motion.p>
          )}

          {answered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className={`flex items-center gap-2 text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                {isCorrect ? <><CheckCircle2 size={16} />Bonne réponse !</> : <><XCircle size={16} />La bonne réponse était : {question.options[question.correct_option]}</>}
              </div>
              {showExplanation && question.explanation && (
                <div className="p-3 bg-secondary/50 rounded-lg text-sm">
                  <span className="font-semibold">Explication : </span>{question.explanation}
                </div>
              )}
              {currentIndex < questions.length - 1 ? (
                <Button onClick={nextQuestion} className="bg-gradient-primary">Question suivante</Button>
              ) : (
                <div className="text-center p-4">
                  <p className="font-semibold text-primary">Quiz terminé ! 🎉</p>
                  <Button variant="outline" className="mt-2" onClick={() => { setSelectedQuiz(null); resetQuestion(); }}>Retour</Button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default QuizPlayer;
