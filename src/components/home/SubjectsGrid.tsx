import { motion } from "framer-motion";
import SubjectCard from "./SubjectCard";
import { SUBJECTS_GENERAL, SUBJECTS_LYCEE } from "@/lib/constants";

const SubjectsGrid = () => {
  return (
    <div className="space-y-6">
      {/* General subjects */}
      <div>
        <h3 className="font-heading font-semibold text-foreground mb-3">Matières générales</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {SUBJECTS_GENERAL.map((subject, i) => (
            <SubjectCard key={subject.id} {...subject} index={i} />
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Spécialités Lycée</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Lycée subjects */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {SUBJECTS_LYCEE.map((subject, i) => (
            <SubjectCard key={subject.id} {...subject} index={i + SUBJECTS_GENERAL.length} />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SubjectsGrid;
