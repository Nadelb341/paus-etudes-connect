-- Exercices : le corrigé et l'historique « fait avec <élève> » passent sous clé.
-- 2026-11-08 — Avant : solution + done_log étaient dans chapter_exercises, lisibles via l'API par tout
-- élève à qui l'exercice est attribué (le masquage n'était fait que par l'appli).
-- Maintenant : table à part, lisible par l'admin seule ; les élèves reçoivent le corrigé UNIQUEMENT
-- par la fonction exercise_solutions_visibles, et seulement si l'enseignante l'a rendu visible.
-- Les colonnes solution/done_log de chapter_exercises restent (compatibilité) mais sont toujours vides.

-- ─── 1. Table secrète ───────────────────────────────────────────────────────────
-- Clé étrangère « DEFERRABLE INITIALLY DEFERRED » : le filet de sécurité (point 4) écrit le corrigé
-- AVANT que la ligne de l'exercice n'existe (déclencheur BEFORE INSERT) ; la vérification se fait à la fin
-- de la transaction.
CREATE TABLE IF NOT EXISTS public.chapter_exercise_secrets (
  exercise_id uuid PRIMARY KEY
    REFERENCES public.chapter_exercises(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  solution text NOT NULL DEFAULT '',
  done_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chapter_exercise_secrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manages exercise secrets" ON public.chapter_exercise_secrets;
CREATE POLICY "Admin manages exercise secrets" ON public.chapter_exercise_secrets
  FOR ALL TO authenticated
  USING (auth.email() = 'nad341@live.fr')
  WITH CHECK (auth.email() = 'nad341@live.fr');
REVOKE ALL ON public.chapter_exercise_secrets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_exercise_secrets TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chapter_exercise_secrets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chapter_exercise_secrets;
  END IF;
END $$;

-- ─── 2. Recopie de l'existant puis on vide les colonnes visibles ────────────────
INSERT INTO public.chapter_exercise_secrets (exercise_id, solution, done_log)
SELECT id, coalesce(solution, ''), coalesce(done_log, '[]'::jsonb)
FROM public.chapter_exercises
WHERE coalesce(solution, '') <> '' OR coalesce(done_log, '[]'::jsonb) <> '[]'::jsonb
ON CONFLICT (exercise_id) DO NOTHING;

UPDATE public.chapter_exercises
SET solution = '', done_log = '[]'::jsonb
WHERE solution <> '' OR done_log <> '[]'::jsonb;

-- ─── 3. Corrigés visibles pour la personne connectée ────────────────────────────
CREATE OR REPLACE FUNCTION public.exercise_solutions_visibles(p_chapter uuid)
RETURNS TABLE (exercise_id uuid, solution text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.exercise_id, s.solution
  FROM public.chapter_exercise_secrets s
  JOIN public.chapter_exercises e ON e.id = s.exercise_id
  WHERE e.chapter_id = p_chapter
    AND (
      auth.email() = 'nad341@live.fr'
      OR (e.solution_visible_to_students
          AND e.target_student_ids IS NOT NULL
          AND auth.uid() = ANY (e.target_student_ids))
    )
$$;
REVOKE ALL ON FUNCTION public.exercise_solutions_visibles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exercise_solutions_visibles(uuid) TO authenticated;

-- ─── 4. Filet de sécurité : rien ne doit plus rester dans chapter_exercises ──────
-- Si un ancien client (ou un script) écrit encore solution/done_log dans chapter_exercises, on déplace
-- la valeur dans la table secrète et on vide la colonne AVANT l'écriture (déclencheur BEFORE : la valeur
-- n'est jamais enregistrée, donc jamais diffusée en temps réel aux élèves).
-- done_log : les entrées nouvelles sont AJOUTÉES à l'historique existant (un ancien client lit un
-- historique vide et n'envoie que la nouvelle entrée : on ne doit pas effacer le reste).
CREATE OR REPLACE FUNCTION public.chapter_exercises_proteger_secrets()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sol text := coalesce(NEW.solution, '');
  v_log jsonb := coalesce(NEW.done_log, '[]'::jsonb);
BEGIN
  IF v_sol = '' AND v_log = '[]'::jsonb THEN
    RETURN NEW;
  END IF;
  IF jsonb_typeof(v_log) <> 'array' THEN v_log := '[]'::jsonb; END IF;

  INSERT INTO public.chapter_exercise_secrets AS s (exercise_id, solution, done_log, updated_at)
  VALUES (NEW.id, v_sol, v_log, now())
  ON CONFLICT (exercise_id) DO UPDATE SET
    solution = CASE WHEN v_sol <> '' THEN v_sol ELSE s.solution END,
    done_log = s.done_log || coalesce((
      SELECT jsonb_agg(x) FROM jsonb_array_elements(v_log) x
      WHERE NOT s.done_log @> jsonb_build_array(x)
    ), '[]'::jsonb),
    updated_at = now();

  NEW.solution := '';
  NEW.done_log := '[]'::jsonb;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chapter_exercises_proteger_secrets() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_chapter_exercises_proteger_secrets ON public.chapter_exercises;
CREATE TRIGGER trg_chapter_exercises_proteger_secrets
  BEFORE INSERT OR UPDATE OF solution, done_log ON public.chapter_exercises
  FOR EACH ROW EXECUTE FUNCTION public.chapter_exercises_proteger_secrets();
