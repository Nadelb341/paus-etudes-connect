-- 🏆 Onglet « Défis » : un défi = un exercice plus ambitieux (problème ouvert, olympiade, réflexion).
-- Migration ADDITIVE : les exercices existants deviennent kind='exercice' (valeur par défaut).
-- Même fonctionnement que les exercices : RLS, corrigé sous clé (chapter_exercise_secrets),
-- RPC exercise_solutions_visibles, corbeille, copie. chapitres_remplis compte déjà toute la table.

ALTER TABLE public.chapter_exercises
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'exercice';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapter_exercises_kind_check') THEN
    ALTER TABLE public.chapter_exercises
      ADD CONSTRAINT chapter_exercises_kind_check CHECK (kind IN ('exercice', 'defi'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS chapter_exercises_chapter_kind_idx ON public.chapter_exercises (chapter_id, kind);

-- Recherche : les défis remontent avec leur propre type (« defi ») au lieu de « exercise »
CREATE OR REPLACE FUNCTION public.search_bibliotheque(q text)
RETURNS TABLE (kind text, item_id uuid, item_title text, chapter_id uuid, chapter_title text,
               theme_id uuid, theme_title text, subject_id text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH p AS (
    SELECT '%' || replace(replace(replace(public.pe_sans_accent(btrim(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pat
  )
  SELECT * FROM (
    SELECT 'theme'::text, t.id, t.title, NULL::uuid, NULL::text, t.id, t.title, t.subject_id
      FROM public.subject_themes t, p WHERE public.pe_sans_accent(t.title) LIKE p.pat
    UNION ALL
    SELECT 'chapter', c.id, c.title, c.id, c.title, c.theme_id, t.title, c.subject_id
      FROM public.subject_chapters c LEFT JOIN public.subject_themes t ON t.id = c.theme_id, p
      WHERE public.pe_sans_accent(c.title) LIKE p.pat
    UNION ALL
    SELECT CASE WHEN e.kind = 'defi' THEN 'defi' ELSE 'exercise' END, e.id, e.title, c.id, c.title, c.theme_id, t.title, c.subject_id
      FROM public.chapter_exercises e JOIN public.subject_chapters c ON c.id = e.chapter_id
      LEFT JOIN public.subject_themes t ON t.id = c.theme_id, p
      WHERE public.pe_sans_accent(e.title) LIKE p.pat
    UNION ALL
    SELECT 'document', d.id, d.file_name, c.id, c.title, c.theme_id, t.title, c.subject_id
      FROM public.chapter_documents d JOIN public.subject_chapters c ON c.id = d.chapter_id
      LEFT JOIN public.subject_themes t ON t.id = c.theme_id, p
      WHERE public.pe_sans_accent(d.file_name) LIKE p.pat
  ) r
  WHERE length(btrim(q)) >= 2
  LIMIT 200
$$;
