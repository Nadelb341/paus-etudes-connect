import { useState, useEffect } from "react";
import SubjectCard from "./SubjectCard";
import SubjectContentDialog from "./SubjectContentDialog";
import { SUBJECTS_GENERAL, SUBJECTS_LYCEE, ADMIN_EMAIL } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubjectVisibility { [key: string]: boolean; }

const SubjectsGrid = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [visibility, setVisibility] = useState<SubjectVisibility>({});
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS_GENERAL[0] | null>(null);
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => { fetchVisibility(); }, []);

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

  const openSubject = (subject: typeof SUBJECTS_GENERAL[0], manage = false) => {
    setSelectedSubject(subject);
    setManageMode(manage);
  };

  const allSubjects = [...SUBJECTS_GENERAL, ...SUBJECTS_LYCEE];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading font-semibold text-foreground mb-3">Matières générales</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {SUBJECTS_GENERAL.map((subject, i) => (
            <SubjectCard
              key={subject.id} {...subject} index={i}
              isVisible={visibility[subject.id] !== false}
              onClick={() => openSubject(subject)}
              onManageContent={() => openSubject(subject, true)}
              onToggleVisibility={() => toggleVisibility(subject.id)}
            />
          ))}
        </div>
      </div>

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
            onClick={() => openSubject(subject)}
            onManageContent={() => openSubject(subject, true)}
            onToggleVisibility={() => toggleVisibility(subject.id)}
          />
        ))}
      </div>

      {selectedSubject && (
        <SubjectContentDialog
          open={!!selectedSubject}
          onOpenChange={(open) => { if (!open) setSelectedSubject(null); }}
          subjectId={selectedSubject.id}
          subjectLabel={selectedSubject.label}
          subjectIcon={selectedSubject.icon}
          subjectColor={selectedSubject.color}
          manageMode={manageMode}
        />
      )}
    </div>
  );
};

export default SubjectsGrid;
