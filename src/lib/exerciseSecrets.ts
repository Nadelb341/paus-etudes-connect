import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DoneEntry } from "@/components/home/chapter/chapterShared";

/**
 * Corrigé + historique « fait avec <élève> » d'un exercice : rangés dans la table
 * chapter_exercise_secrets (lisible par l'admin seule). Les colonnes solution/done_log de
 * chapter_exercises restent toujours vides (un déclencheur en base les vide de toute façon).
 */
export interface ExerciseSecret {
  solution: string;
  done_log: DoneEntry[];
}

/** Admin : secrets des exercices donnés (id → secret). */
export async function fetchExerciseSecrets(ids: string[]): Promise<Map<string, ExerciseSecret>> {
  const map = new Map<string, ExerciseSecret>();
  if (!ids.length) return map;
  const { data } = await supabase.from("chapter_exercise_secrets").select("exercise_id, solution, done_log").in("exercise_id", ids);
  (data || []).forEach(s => map.set(s.exercise_id, {
    solution: s.solution || "",
    done_log: Array.isArray(s.done_log) ? (s.done_log as unknown as DoneEntry[]) : [],
  }));
  return map;
}

/** Admin : enregistre (crée ou remplace) le corrigé et/ou l'historique d'un exercice. */
export async function saveExerciseSecret(exerciseId: string, patch: Partial<ExerciseSecret>) {
  const row: { exercise_id: string; updated_at: string; solution?: string; done_log?: Json } = {
    exercise_id: exerciseId, updated_at: new Date().toISOString(),
  };
  if (patch.solution !== undefined) row.solution = patch.solution;
  if (patch.done_log !== undefined) row.done_log = patch.done_log as unknown as Json;
  const { error } = await supabase.from("chapter_exercise_secrets").upsert(row, { onConflict: "exercise_id" });
  return !error;
}

/** Copie complète d'exercices pour la corbeille : la ligne + son secret (clé `secret`). */
export async function withSecretsForTrash<T extends { id: string }>(rows: T[]): Promise<(T & { secret: ExerciseSecret | null })[]> {
  const secrets = await fetchExerciseSecrets(rows.map(r => r.id));
  return rows.map(r => ({ ...r, secret: secrets.get(r.id) ?? null }));
}
