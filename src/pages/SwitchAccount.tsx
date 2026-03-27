import AppHeader from "@/components/layout/AppHeader";
import { Users } from "lucide-react";

const SwitchAccountPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={24} className="text-primary" />
          <h1 className="text-xl font-heading font-bold text-foreground">Changer de compte</h1>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-card p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Changez d'élève au sein de la même famille sans vous déconnecter.
          </p>
          <p className="text-muted-foreground text-xs mt-2">
            Les comptes de votre famille apparaîtront ici.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SwitchAccountPage;
