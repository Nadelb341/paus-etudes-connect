import { Settings, Users, Mail, Shield, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface AppHeaderProps {
  notificationCounts?: {
    settings?: number;
    accounts?: number;
    messages?: number;
    dashboard?: number;
  };
}

const AppHeader = ({ notificationCounts = {} }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Accueil", path: "/", key: "home" },
    { icon: Mail, label: "Messages", path: "/messages", key: "messages" },
    { icon: Shield, label: "Tableau de bord", path: "/dashboard", key: "dashboard" },
    { icon: Users, label: "Comptes", path: "/switch-account", key: "accounts" },
    { icon: Settings, label: "Paramètres", path: "/settings", key: "settings" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border shadow-card">
      <div className="flex items-center justify-end px-4 py-2">
        <nav className="flex items-center gap-1">
          {navItems.map(({ icon: Icon, label, path, key }) => {
            const isActive = location.pathname === path;
            const count = notificationCounts[key as keyof typeof notificationCounts];

            return (
              <button
                key={key}
                onClick={() => navigate(path)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                title={label}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium hidden sm:block">{label}</span>
                {count && count > 0 && (
                  <span className="badge-notification">{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
