import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSubjectsForLevel } from "@/lib/constants";

interface Subject { id: string; label: string; icon: string; color: string; }

interface LevelSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: string | null;
  onSelectSubject: (subject: Subject) => void;
}

const LevelSubjectsDialog = ({ open, onOpenChange, level, onSelectSubject }: LevelSubjectsDialogProps) => {
  if (!level) return null;

  const subjects = getSubjectsForLevel(level);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Niveau : <span className="font-bold">{level}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 py-2">
          {subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => onSelectSubject(subject)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all hover:shadow-md active:scale-95"
              style={{ borderColor: subject.color }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = subject.color + "18";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
              }}
            >
              <span className="text-2xl leading-none">{subject.icon}</span>
              <span className="text-xs font-medium leading-tight" style={{ color: subject.color }}>
                {subject.label}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelSubjectsDialog;
