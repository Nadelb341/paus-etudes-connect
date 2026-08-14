import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";

/**
 * Total des actions en attente dans le Tableau de bord admin (inscriptions en attente +
 * notes en attente de suivi) — même source que les badges affichés dans Dashboard.tsx,
 * pour que l'icône "Tableau de bord" du header affiche toujours le même total, qu'on soit
 * sur l'accueil ou déjà dans le tableau de bord.
 */
export const useAdminDashboardBadge = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const [pendingRes, hoursRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("tutoring_hours").select("*", { count: "exact", head: true }).eq("track_note", true),
    ]);
    setCount((pendingRes.count || 0) + (hoursRes.count || 0));
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-dashboard-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tutoring_hours" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, load]);

  return count;
};
