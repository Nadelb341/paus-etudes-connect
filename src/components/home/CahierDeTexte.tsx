import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, Check } from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Homework {
  id: string;
  subject_id: string;
  title: string;
  due_date: string;
  description: string;
  completed: boolean;
}

const CahierDeTexte = () => {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [homework, setHomework] = useState<Homework[]>([]);

  const getWeekDates = (offset: number) => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
    return DAYS_OF_WEEK.map((day, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return {
        day,
        date: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        fullDate: date.toISOString().split("T")[0],
      };
    });
  };

  const weekDates = getWeekDates(weekOffset);
  const startDate = weekDates[0].fullDate;
  const endDate = weekDates[weekDates.length - 1].fullDate;

  useEffect(() => {
    fetchHomework();
  }, [weekOffset, user]);

  const fetchHomework = async () => {
    if (!user) return;
    const { data: hwData } = await supabase
      .from("homework")
      .select("*")
      .gte("due_date", startDate)
      .lte("due_date", endDate)
      .order("due_date");

    const { data: completions } = await supabase
      .from("homework_completions")
      .select("homework_id, completed")
      .eq("user_id", user.id);

    const completionMap: Record<string, boolean> = {};
    completions?.forEach(c => { completionMap[c.homework_id] = c.completed ?? false; });

    const merged = (hwData || []).map(hw => ({
      ...hw,
      completed: completionMap[hw.id] || false,
    }));
    setHomework(merged);
  };

  const toggleCompletion = async (hwId: string, currentlyCompleted: boolean) => {
    if (!user) return;
    if (currentlyCompleted) {
      await supabase.from("homework_completions").delete().eq("homework_id", hwId).eq("user_id", user.id);
    } else {
      await supabase.from("homework_completions").upsert({
        homework_id: hwId,
        user_id: user.id,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: "homework_id,user_id" });
    }
    fetchHomework();
  };

  const getWeekLabel = () => {
    if (weekOffset === 0) return "Cette semaine";
    if (weekOffset === -1) return "Semaine dernière";
    if (weekOffset === 1) return "Semaine prochaine";
    return `Semaine du ${weekDates[0].date}`;
  };

  const getSubjectLabel = (subjectId: string) => {
    const all = [...(require("@/lib/constants").SUBJECTS_GENERAL), ...(require("@/lib/constants").SUBJECTS_LYCEE)];
    return all.find((s: any) => s.id === subjectId)?.label || subjectId;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-card rounded-lg shadow-card border border-border overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Cahier de texte</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(p => p - 1)} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{getWeekLabel()}</span>
          <button onClick={() => setWeekOffset(p => p + 1)} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {weekDates.map(({ day, date, fullDate }) => {
            const dayHomework = homework.filter(hw => hw.due_date === fullDate);
            const isToday = fullDate === new Date().toISOString().split("T")[0];
            return (
              <div key={fullDate} className={`flex border-b border-border last:border-0 ${isToday ? "bg-primary/5" : ""}`}>
                <div className={`w-28 shrink-0 p-3 border-r border-border flex flex-col items-center justify-center ${isToday ? "bg-primary/10" : "bg-secondary/20"}`}>
                  <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>
                <div className="flex-1 p-3 min-h-[60px]">
                  {dayHomework.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Aucun devoir</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayHomework.map(hw => (
                        <div key={hw.id} className="flex items-center gap-2 text-sm">
                          <button
                            onClick={() => toggleCompletion(hw.id, hw.completed)}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              hw.completed ? "bg-green-500 border-green-500 text-white" : "border-border hover:border-primary"
                            }`}
                          >
                            {hw.completed && <Check size={10} />}
                          </button>
                          <span className="text-xs font-medium text-primary">{getSubjectLabel(hw.subject_id)}</span>
                          <span className={`text-xs ${hw.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{hw.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default CahierDeTexte;
