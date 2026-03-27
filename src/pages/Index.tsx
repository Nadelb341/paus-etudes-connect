import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/layout/AppHeader";
import WelcomeBanner from "@/components/home/WelcomeBanner";
import CahierDeTexte from "@/components/home/CahierDeTexte";
import SubjectsGrid from "@/components/home/SubjectsGrid";

const Index = () => {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name || "Élève";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-5 pb-8">
        <WelcomeBanner firstName={firstName} />
        <CahierDeTexte />
        <SubjectsGrid />
      </main>
    </div>
  );
};

export default Index;
