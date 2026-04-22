import { useState, useEffect } from "react";
import SubjectCard from "./SubjectCard";
import SubjectContentDialog from "./SubjectContentDialog";
import SubjectLevelDialog from "./SubjectLevelDialog";
import { SUBJECTS_GENERAL, SUBJECTS_LYCEE, ADMIN_EMAIL, levelSubjectId } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubjectVisibility { [key: string]: boolean; }

type Subject = typeof SUBJECTS_GENERAL[0];

const LYCEE_LEVELS = ["Seconde", "Première", "Terminale"];

const SubjectsGrid = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [userLevel, setUserLevel] = useState<string>(user?.user_metadata?.school_level || "");
  const showLycee = isAdmin || LYCEE_LEVELS.includes(userLevel);
  const [visibility, setVisibility] = useState<SubjectVisibility>({});

  // Sélecteur de niveau (admin uniquement)
  const [levelDialogSubject, setLevelDialogSubject] = useState<Subject | null>(null);

  // Dialog contenu
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => { fetchVisibility(); }, []);

  // Récupère le niveau réel de l'élève depuis la BDD (plus fiable que user_metadata)
  useEffect(() => {
    if (!isAdmin && user?.id && !userLevel) {
      supabase
        .from("profiles")
        .select("school_level")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.school_level) setUserLevel(data.school_level);
        });
    }
  }, [user?.id, isAdmin]);

  const fetchVisibility = async () => {
    const { data } = await supabase.from("subject_content").select("subject_id, is_visible");
    const vis: SubjectVisibility = {};
    data?.forEach(d => { vis[d.subject_id] = d.is_visible ?? true; });
    setVisibility(vis);
  };

  const toggleVisibility = async (subjectId: string) => {
    const current = visibility[subjectId] !== false;
    const { data: existing } = await supabase.from("subject_content").select("id").eq("subject_id", subjectId).maybeSingle();
    if (existing) {
      await supabase.from("subject_content").update({ is_visible: !current }).eq("id", existing.id);
    } else {
      await supabase.from("subject_content").insert({ subject_id: subjectId, is_visible: !current, created_by: user?.id });
    }
    setVisibility(prev => ({ ...prev, [subjectId]: !current }));
    toast.success(!current ? "Matière affichée" : "Matière masquée");
  };

  const handleSubjectClick = (subject: Subject) => {
    if (isAdmin) {
      // Admin → sélecteur de niveau (vue lecture)
      setManageMode(false);
      setLevelDialogSubject(subject);
    } else {
      // Élève → ouvre directement son niveau
      const level = userLevel || "";
      setSelectedSubject(subject);
      setSelectedLevel(level || null);
      setManageMode(false);
    }
  };

  const handleManageContent = (subject: Subject) => {
    // Admin uniquement → sélecteur de niveau en mode gestion
    setLevelDialogSubject(subject);
    setManageMode(true);
  };

  const handleLevelSelected = (level: string) => {
    if (!levelDialogSubject) return;
    setLevelDialogSubject(null);
    setSelectedSubject(levelDialogSubject);
    setSelectedLevel(level);
    // manageMode déjà positionné dans handleManageContent ou false par défaut
  };

  const handleCloseLevelDialog = (open: boolean) => {
    if (!open) {
      setLevelDialogSubject(null);
      setManageMode(false);
    }
  };

  const handleCloseContentDialog = (open: boolean) => {
    if (!open) {
      setSelectedSubject(null);
      setSelectedLevel(null);
      setManageMode(false);
    }
  };

  const compositeSubjectId = selectedSubject && selectedLevel
    ? levelSubjectId(selectedSubject.id, selectedLevel)
    : selectedSubject?.id ?? "";

  const compositeSubjectLabel = selectedSubject && selectedLevel
    ? `${selectedSubject.label} — ${selectedLevel}`
    : selectedSubject?.label ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading font-semibold text-foreground mb-3">Matières générales</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {SUBJECTS_GENERAL.map((subject, i) => (
            <SubjectCard
              key={subject.id} {...subject} index={i}
              isVisible={visibility[subject.id] !== false}
              onClick={() => handleSubjectClick(subject)}
              onManageContent={() => handleManageContent(subject)}
              onToggleVisibility={() => toggleVisibility(subject.id)}
            />
          ))}
        </div>
      </div>

      {showLycee && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Spécialités Lycée</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {SUBJECTS_LYCEE.map((subject, i) => (
              <SubjectCard
                key={subject.id} {...subject} index={i + SUBJECTS_GENERAL.length}
                isVisible={visibility[subject.id] !== false}
                onClick={() => handleSubjectClick(subject)}
                onManageContent={() => handleManageContent(subject)}
                onToggleVisibility={() => toggleVisibility(subject.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Sélecteur de niveau (admin) */}
      <SubjectLevelDialog
        open={!!levelDialogSubject}
        onOpenChange={handleCloseLevelDialog}
        subject={levelDialogSubject}
        onSelectLevel={handleLevelSelected}
      />

      {/* Dialog de contenu */}
      {selectedSubject && (
        <SubjectContentDialog
          open={!!selectedSubject}
          onOpenChange={handleCloseContentDialog}
          subjectId={compositeSubjectId}
          subjectLabel={compositeSubjectLabel}
          subjectIcon={selectedSubject.icon}
          subjectColor={selectedSubject.color}
          manageMode={manageMode}
        />
      )}
    </div>
  );
};

export default SubjectsGrid;
