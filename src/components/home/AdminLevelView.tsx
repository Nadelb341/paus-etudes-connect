import { Button } from "@/components/ui/button";
import { MATERNELLE_LEVELS, PRIMARY_LEVELS, COLLEGE_LEVELS, LYCEE_MAIN_LEVELS } from "@/lib/constants";

interface AdminLevelViewProps {
  onSelectSubLevel: (level: string) => void;
}

const LEVEL_GROUPS = [
  {
    label: "Maternelle",
    levels: [...MATERNELLE_LEVELS],
    color: "hsl(330, 60%, 55%)",
  },
  {
    label: "Primaire",
    levels: [...PRIMARY_LEVELS],
    color: "hsl(32, 80%, 50%)",
  },
  {
    label: "Collège",
    levels: [...COLLEGE_LEVELS],
    color: "hsl(217, 91%, 60%)",
  },
  {
    label: "Lycée",
    levels: [...LYCEE_MAIN_LEVELS],
    color: "hsl(280, 60%, 50%)",
  },
] as const;

const AdminLevelView = ({ onSelectSubLevel }: AdminLevelViewProps) => {
  return (
    <div className="space-y-4">
      {LEVEL_GROUPS.map(group => (
        <div
          key={group.label}
          className="rounded-xl border-2 p-4"
          style={{ borderColor: group.color }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: group.color }}
          >
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.levels.map(level => (
              <Button
                key={level}
                variant="outline"
                className="h-9 px-5 font-medium transition-all"
                style={{ borderColor: group.color, color: group.color }}
                onMouseEnter={e => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.backgroundColor = group.color;
                  btn.style.color = "white";
                }}
                onMouseLeave={e => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.backgroundColor = "";
                  btn.style.color = group.color;
                }}
                onClick={() => onSelectSubLevel(level)}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminLevelView;
