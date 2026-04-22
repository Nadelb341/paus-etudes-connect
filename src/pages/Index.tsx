import { useState, useEffect, useCallback } from "react";
import { useWindowScrollToTop } from "@/hooks/useScrollToTop";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
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
import QuickNotes from "@/components/home/QuickNotes";
import logo from "@/assets/logo.png";

interface Reminder {
  id: string; message: string; created_at: string; seen_at: string | null;
}

const Index = () => {
  const { user } = useAuth();
  const { viewMode } = useAdminView();
  const { showScrollTop, handleScroll, scrollToTop } = useWindowScrollToTop();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const firstName = user?.user_metadata?.first_name || "Élève";
  const userStatus = user?.user_metadata?.status;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [badges, setBadges] = useState({ appointments: 0, homework: 0, messages: 0 });

  // --- Badge computation ---
  const computeBadges = useCallback(async () => {
    if (!user) return;
    let appointmentCount = 0;
    let homeworkCount = 0;
    let messageCount = 0;

    // Appointments badge (student: unseen active RDV)
    if (!isAdmin && userStatus !== "parent") {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("seen_by_student", false)
        .eq("status", "active")
        .eq("is_visible", true);
      appointmentCount = count || 0;
    }

    // Homework badge (student: incomplete homework from today)
    if (!isAdmin && userStatus !== "parent") {
      const today = new Date().toISOString().split("T")[0];
      const { data: hwData } = await supabase.from("homework").select("id, target_levels, target_student_ids").gte("due_date", today);
      const { data: completions } = await supabase.from("homework_completions")
        .select("homework_id").eq("user_id", user.id).eq("completed", true);
      const completedSet = new Set(completions?.map((c: any) => c.homework_id) || []);
      const { data: profileData } = await supabase.from("profiles").select("school_level").eq("user_id", user.id).maybeSingle();
      const level = profileData?.school_level || "";
      homeworkCount = (hwData || []).filter((hw: any) => {
        if (completedSet.has(hw.id)) return false;
        const hasLevels = hw.target_levels && hw.target_levels.length > 0;
        const hasStudents = hw.target_student_ids && hw.target_student_ids.length > 0;
        if (!hasLevels && !hasStudents) return true;
        if (hasLevels && level && hw.target_levels.includes(level)) return true;
        if (hasStudents && hw.target_student_ids.includes(user.id)) return true;
        return false;
      }).length;
    }

    // Messages badge (all users: messages received since last visit)
    const lastRead = localStorage.getItem(`msw_messages_last_read_${user.id}`) || "2000-01-01T00:00:00Z";
    const { data: msgData } = await supabase.from("messages")
      .select("id, sender_id, recipient_type, recipient_ids")
      .gt("created_at", lastRead)
      .neq("sender_id", user.id);
    messageCount = (msgData || []).filter((msg: any) => {
      if (msg.recipient_type === "all") return true;
      if (msg.recipient_ids?.includes(user.id)) return true;
      return false;
    }).length;

    setBadges({ appointments: appointmentCount, homework: homeworkCount, messages: messageCount });
  }, [user, isAdmin, userStatus]);

  useEffect(() => {
    computeBadges();
    // Real-time badge updates
    const ch1 = supabase.channel("badge-appts").on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => computeBadges()).subscribe();
    const ch2 = supabase.channel("badge-hw").on("postgres_changes", { event: "*", schema: "public", table: "homework" }, () => computeBadges()).subscribe();
    const ch3 = supabase.channel("badge-msg").on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => computeBadges()).subscribe();
    return () => { [ch1, ch2, ch3].forEach(c => supabase.removeChannel(c)); };
  }, [computeBadges]);

  const totalBadge = badges.appointments + badges.homework + badges.messages;

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

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader notificationCounts={{ messages: badges.messages }} />
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-5 pb-8">
        <div className="flex flex-col items-center pt-2 relative">
          <div className="relative inline-flex flex-col items-center">
            <div className="overflow-hidden h-32 w-48 relative">
              <img src={logo} alt="Paus'étude" width={192} height={192} className="w-48 h-48 object-contain object-top" />
              {totalBadge > 0 && (
                <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-sm font-bold rounded-full min-w-[28px] h-7 flex items-center justify-center px-1.5 shadow-lg animate-pulse">
                  {totalBadge}
                </span>
              )}
            </div>
            <p className="text-xl font-heading font-bold text-primary -mt-3">Paus'étude</p>
          </div>
        </div>

        {showParentView ? (
          <ParentHome />
        ) : (
          <>
            <WelcomeBanner firstName={firstName} />

            {/* Notes rapides admin */}
            {isAdmin && viewMode !== "parent" && <QuickNotes />}

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

            <AppointmentsCard badgeCount={badges.appointments} />
            <CahierDeTexte badgeCount={badges.homework} />
            <SubjectsGrid />
          </>
        )}
      </main>
      <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} position="fixed" />
    </div>
  );
};

export default Index;
