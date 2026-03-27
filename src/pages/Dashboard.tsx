import AppHeader from "@/components/layout/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Shield, Users, Clock, Bell, BookOpen, Activity } from "lucide-react";
import { motion } from "framer-motion";

const DashboardCard = ({ icon: Icon, title, description, color, index }: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className="bg-card rounded-lg border border-border shadow-card hover:shadow-card-hover transition-all cursor-pointer p-4"
  >
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <h3 className="font-heading font-semibold text-sm text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  </motion.div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <Shield size={48} className="mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-heading font-bold text-foreground">Accès restreint</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Seul l'administrateur peut accéder au tableau de bord.
          </p>
        </main>
      </div>
    );
  }

  const cards = [
    { icon: Activity, title: "Monitoring", description: "Statistiques, utilisateurs en ligne", color: "hsl(217, 91%, 60%)" },
    { icon: Users, title: "Élèves", description: "Gérer les inscriptions et les profils", color: "hsl(142, 71%, 45%)" },
    { icon: Clock, title: "Registre des heures", description: "Suivi des cours et facturation", color: "hsl(32, 80%, 50%)" },
    { icon: Bell, title: "Notifications", description: "Envoyer des notifications aux élèves", color: "hsl(350, 65%, 50%)" },
    { icon: BookOpen, title: "Cahier de texte", description: "Créer et gérer les devoirs", color: "hsl(260, 50%, 55%)" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={24} className="text-primary" />
          <h1 className="text-xl font-heading font-bold text-foreground">Tableau de bord</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((card, i) => (
            <DashboardCard key={card.title} {...card} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
