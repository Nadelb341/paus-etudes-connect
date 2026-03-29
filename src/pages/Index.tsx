import { useAuth } from "@/hooks/useAuth";
import { useAdminView } from "@/hooks/useAdminView";
import { ADMIN_EMAIL } from "@/lib/constants";
import AppHeader from "@/components/layout/AppHeader";
import WelcomeBanner from "@/components/home/WelcomeBanner";
import CahierDeTexte from "@/components/home/CahierDeTexte";
import SubjectsGrid from "@/components/home/SubjectsGrid";
import ParentHome from "@/components/home/ParentHome";
import logo from "@/assets/logo.png";

const Index = () => {
  const { user } = useAuth();
  const { viewMode } = useAdminView();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const firstName = user?.user_metadata?.first_name || "Élève";
  const userStatus = user?.user_metadata?.status;

  // Show parent view if: admin toggled to parent mode, OR user is a parent
  const showParentView = (isAdmin && viewMode === "parent") || (!isAdmin && userStatus === "parent");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-5 pb-8">
        <div className="flex flex-col items-center gap-1 pt-2">
          <img src={logo} alt="Paus'études" width={48} height={48} />
          <span className="font-heading font-bold text-lg text-foreground">Paus'études</span>
        </div>

        {showParentView ? (
          <ParentHome />
        ) : (
          <>
            <WelcomeBanner firstName={firstName} />
            <CahierDeTexte />
            <SubjectsGrid />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
