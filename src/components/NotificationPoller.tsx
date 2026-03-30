import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

const NotificationPoller = () => {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      try {
        await supabase.functions.invoke("send-notifications", { body: {} });
      } catch (e) {
        // silently ignore polling errors
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  return null;
};

export default NotificationPoller;
