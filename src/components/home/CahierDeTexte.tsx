import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, Check } from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants";

interface Homework {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

const CahierDeTexte = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const getWeekLabel = () => {
    if (weekOffset === 0) return "Cette semaine";
    if (weekOffset === -1) return "Semaine dernière";
    if (weekOffset === 1) return "Semaine prochaine";
    return `Semaine du ${weekDates[0].date}`;
  };

  // Mock homework data - will be replaced with Supabase data
  const mockHomework: Record<string, Homework[]> = {};

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
          <button
            onClick={() => setWeekOffset((p) => p - 1)}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
            {getWeekLabel()}
          </span>
          <button
            onClick={() => setWeekOffset((p) => p + 1)}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto">
        <div className="min-w-[600px]">
          {weekDates.map(({ day, date, fullDate }) => {
            const dayHomework = mockHomework[fullDate] || [];
            const isToday = fullDate === new Date().toISOString().split("T")[0];

            return (
              <div
                key={fullDate}
                className={`flex border-b border-border last:border-0 ${
                  isToday ? "bg-primary/5" : ""
                }`}
              >
                <div className={`w-28 shrink-0 p-3 border-r border-border flex flex-col items-center justify-center ${
                  isToday ? "bg-primary/10" : "bg-secondary/20"
                }`}>
                  <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {day}
                  </span>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>
                <div className="flex-1 p-3 min-h-[60px]">
                  {dayHomework.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Aucun devoir</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayHomework.map((hw) => (
                        <div key={hw.id} className="flex items-center gap-2 text-sm">
                          <button className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            hw.completed
                              ? "bg-success border-success text-success-foreground"
                              : "border-border hover:border-primary"
                          }`}>
                            {hw.completed && <Check size={10} />}
                          </button>
                          <span className="text-xs font-medium text-primary">{hw.subject}</span>
                          <span className={`text-xs ${hw.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {hw.title}
                          </span>
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
