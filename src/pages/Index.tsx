import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminView } from "@/hooks/useAdminView";
import { ADMIN_EMAIL } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/layout/AppHeader";
import WelcomeBanner from "@/components/home/WelcomeBanner";
import CahierDeTexte from "@/components/home/CahierDeTexte";
import AppointmentsCard from "@/components/home/AppointmentsCard";
import SubjectsGrid from "@/components/home/SubjectsGrid";
import ParentHome from "@/components/home/ParentHome";
import logo from "@/assets/logo.png";

interface Reminder {
  id: string; message: string; created_at: string; seen_at: string | null;
}

const Index = () => {
  const { user } = useAuth();
  const { viewMode } = useAdminView();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const firstName = user?.user_metadata?.first_name || "Élève";
  const userStatus = user?.user_metadata?.status;
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const showParentView = (isAdmin && viewMode === "parent") || (!isAdmin && userStatus === "parent");

  // Fetch active reminders for students
  useEffect(() => {
    if (!user || isAdmin) return;
    const fetchReminders = async () => {
      const { data } = await supabase
        .from("homework_reminders")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (!data) return;
      const now = new Date();
      const active = data.filter((r: any) => {
        if (!r.seen_at) return true;
        const seenAt = new Date(r.seen_at);
        return now.getTime() - seenAt.getTime() < 24 * 60 * 60 * 1000;
      });
      setReminders(active);
      // Mark unseen as seen
      const unseen = active.filter((r: any) => !r.seen_at);
      for (const r of unseen) {
        await supabase.from("homework_reminders").update({ seen_at: now.toISOString() }).eq("id", r.id);
      }
    };
    fetchReminders();
    const channel = supabase.channel("reminders-rt").on(
      "postgres_changes", { event: "*", schema: "public", table: "homework_reminders" },
      () => fetchReminders()
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-5 pb-8">
        <div className="flex flex-col items-center pt-2">
          <img src={logo} alt="My Study Way" width={192} height={192} className="w-48 h-48 object-contain" />
        </div>

        {showParentView ? (
          <ParentHome />
        ) : (
          <>
            <WelcomeBanner firstName={firstName} />

            {/* Reminders from admin */}
            {reminders.length > 0 && (
              <div className="space-y-2">
                {reminders.map(r => (
                  <div key={r.id} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-amber-700 dark:text-amber-400 text-xs mb-1">📋 Rappel de l'enseignant</p>
                    <p className="text-amber-800 dark:text-amber-300">{r.message}</p>
                  </div>
                ))}
              </div>
            )}

            <AppointmentsCard />
            <CahierDeTexte />
            <SubjectsGrid />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
