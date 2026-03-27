import { motion } from "framer-motion";
import { MoreVertical } from "lucide-react";

interface SubjectCardProps {
  id: string;
  label: string;
  icon: string;
  color: string;
  index: number;
  notificationCount?: number;
  onClick?: () => void;
}

const SubjectCard = ({ label, icon, color, index, notificationCount, onClick }: SubjectCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={onClick}
      className="relative bg-card rounded-lg border border-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      {/* Color accent bar */}
      <div className="h-1 w-full" style={{ background: color }} />

      <div className="p-3 flex flex-col items-center text-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">{label}</span>
      </div>

      {/* Admin menu dots - shown on hover */}
      <button
        className="absolute top-2 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          // Admin menu will be implemented later
        }}
      >
        <MoreVertical size={14} />
      </button>

      {/* Notification badge */}
      {notificationCount && notificationCount > 0 && (
        <span className="badge-notification">{notificationCount}</span>
      )}
    </motion.div>
  );
};

export default SubjectCard;
