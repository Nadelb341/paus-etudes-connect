import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * « Tout en direct » : écoute les changements (ajout / modification / suppression)
 * sur une ou plusieurs tables et relance la fonction de chargement fournie.
 *
 * - Un seul canal par instance, avec un nom unique (le composant peut être monté plusieurs fois).
 * - Petit délai (debounce, 300 ms par défaut) : une action qui déclenche plusieurs
 *   événements d'affilée ne provoque qu'un seul rechargement.
 * - La fonction de rappel est lue via une ref : toujours la version la plus récente,
 *   sans réabonnement à chaque rendu.
 * - Ne recharge que des listes : ne jamais passer une fonction qui réinitialise un formulaire ouvert.
 */
export const useRealtimeRefresh = (
  tables: string[],
  callback: () => void,
  enabled: boolean = true,
  debounceMs: number = 300,
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const tablesKey = tables.join(",");

  useEffect(() => {
    if (!enabled || !tablesKey) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        callbackRef.current();
      }, debounceMs);
    };

    const name = `rt-${tablesKey.replace(/,/g, "-")}-${Math.random().toString(36).slice(2, 10)}`;
    let channel = supabase.channel(name);
    for (const table of tablesKey.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, trigger);
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [tablesKey, enabled, debounceMs]);
};
