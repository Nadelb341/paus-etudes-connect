import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PRIMARY_LEVELS, COLLEGE_LEVELS, LYCEE_MAIN_LEVELS } from "@/lib/constants";

interface SubjectLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: { id: string; label: string; icon: string; color: string } | null;
  onSelectLevel: (level: string) => void;
}

const SubjectLevelDialog = ({ open, onOpenChange, subject, onSelectLevel }: SubjectLevelDialogProps) => {
  if (!subject) return null;

  const accent = subject.color;

  const LevelButton = ({ level }: { level: string }) => (
    <Button
      variant="outline"
      className="h-10 px-4 font-medium hover:text-white transition-colors"
      style={{ borderColor: accent, color: accent }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = accent;
        (e.currentTarget as HTMLButtonElement).style.color = "white";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
        (e.currentTarget as HTMLButtonElement).style.color = accent;
      }}
      onClick={() => onSelectLevel(level)}
    >
      {level}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <span>{subject.icon}</span>
            <span>{subject.label}</span>
            <span className="text-muted-foreground font-normal text-base">— Choisir un niveau</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Ligne principale : Maternelle + Primaire + Collège */}
          <div className="flex flex-wrap gap-3 items-start">
            {/* Maternelle — carte individuelle */}
            <LevelButton level="Maternelle" />

            {/* Primaire — carte groupée */}
            <div
              className="rounded-xl border-2 p-3 flex-shrink-0"
              style={{ borderColor: accent }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2 text-center"
                style={{ color: accent }}
              >
                Primaire
              </p>
              <div className="flex flex-wrap gap-2">
                {PRIMARY_LEVELS.map(level => (
                  <LevelButton key={level} level={level} />
                ))}
              </div>
            </div>

            {/* Collège — cartes individuelles */}
            {COLLEGE_LEVELS.map(level => (
              <LevelButton key={level} level={level} />
            ))}
          </div>

          {/* Lycée */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>
              Lycée
            </p>
            <div className="flex flex-wrap gap-3">
              {LYCEE_MAIN_LEVELS.map(level => (
                <LevelButton key={level} level={level} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectLevelDialog;
