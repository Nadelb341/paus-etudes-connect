import { useState } from "react";
import { motion } from "framer-motion";
import { MoreVertical, Eye, EyeOff, Settings2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubjectCardProps {
  id: string;
  label: string;
  icon: string;
  color: string;
  index: number;
  isVisible?: boolean;
  notificationCount?: number;
  onClick?: () => void;
  onToggleVisibility?: () => void;
  onManageContent?: () => void;
}

const SubjectCard = ({ label, icon, color, index, isVisible = true, notificationCount, onClick, onToggleVisibility, onManageContent }: SubjectCardProps) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  if (!isVisible && !isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={onClick}
      className={`relative bg-card rounded-lg border border-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer group overflow-hidden ${!isVisible ? "opacity-50" : ""}`}
    >
      <div className="h-1 w-full" style={{ background: color }} />
      <div className="p-3 flex flex-col items-center text-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">{label}</span>
      </div>

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute top-2 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManageContent?.(); }}>
              <Settings2 size={14} className="mr-2" />
              Gérer le contenu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(); }}>
              {isVisible ? <EyeOff size={14} className="mr-2" /> : <Eye size={14} className="mr-2" />}
              {isVisible ? "Masquer" : "Afficher"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {notificationCount && notificationCount > 0 && (
        <span className="badge-notification">{notificationCount}</span>
      )}
    </motion.div>
  );
};

export default SubjectCard;
