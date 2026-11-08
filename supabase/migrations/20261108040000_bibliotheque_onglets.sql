-- Bibliothèque : chapitre en onglets (Cours, Vidéos & liens, Révision, Fiches visuelles, Quiz,
-- Exercices, Flashcards, Documents), pastilles « rempli », recherche dans toute la bibliothèque.
-- 2026-11-08 — migration ADDITIVE uniquement : aucune donnée existante n'est modifiée ni supprimée.

-- ─── 1. Fiche de révision (texte) sur les chapitres ─────────────────────────────
ALTER TABLE public.subject_chapters ADD COLUMN IF NOT EXISTS revision text;

-- ─── 2. Catégorie des documents : 'document' (par défaut) ou 'fiche' (fiche visuelle) ──
ALTER TABLE public.chapter_documents ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'document';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapter_documents_category_check') THEN
    ALTER TABLE public.chapter_documents
      ADD CONSTRAINT chapter_documents_category_check CHECK (category IN ('document', 'fiche'));
  END IF;
END $$;

-- ─── 3. Exercices ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapter_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.subject_chapters(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  statement text NOT NULL DEFAULT '',
  solution text NOT NULL DEFAULT '',
  difficulty smallint NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  target_student_ids uuid[] NULL,
  solution_visible_to_students boolean NOT NULL DEFAULT false,
  done_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chapter_exercises_chapter_idx ON public.chapter_exercises (chapter_id, order_index);

ALTER TABLE public.chapter_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage exercises" ON public.chapter_exercises;
CREATE POLICY "Admin can manage exercises" ON public.chapter_exercises
  FOR ALL TO authenticated
  USING (auth.email() = 'nad341@live.fr')
  WITH CHECK (auth.email() = 'nad341@live.fr');
DROP POLICY IF EXISTS "Students read given exercises" ON public.chapter_exercises;
CREATE POLICY "Students read given exercises" ON public.chapter_exercises
  FOR SELECT TO authenticated
  USING (target_student_ids IS NOT NULL AND auth.uid() = ANY (target_student_ids));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_exercises TO authenticated;

-- ─── 4. Flashcards ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapter_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.subject_chapters(id) ON DELETE CASCADE,
  front text NOT NULL DEFAULT '',
  back text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chapter_flashcards_chapter_idx ON public.chapter_flashcards (chapter_id, order_index);

ALTER TABLE public.chapter_flashcards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage flashcards" ON public.chapter_flashcards;
CREATE POLICY "Admin can manage flashcards" ON public.chapter_flashcards
  FOR ALL TO authenticated
  USING (auth.email() = 'nad341@live.fr')
  WITH CHECK (auth.email() = 'nad341@live.fr');
DROP POLICY IF EXISTS "Students read flashcards of given chapters" ON public.chapter_flashcards;
CREATE POLICY "Students read flashcards of given chapters" ON public.chapter_flashcards
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.subject_chapters c
    WHERE c.id = chapter_flashcards.chapter_id
      AND c.target_student_ids IS NOT NULL
      AND auth.uid() = ANY (c.target_student_ids)
  ));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_flashcards TO authenticated;

-- ─── 5. Index pour les comptages groupés ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS chapter_documents_chapter_idx ON public.chapter_documents (chapter_id);
CREATE INDEX IF NOT EXISTS quizzes_subject_idx ON public.quizzes (subject_id);
CREATE INDEX IF NOT EXISTS subject_chapters_subject_idx ON public.subject_chapters (subject_id);

-- ─── 6. Temps réel ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chapter_exercises') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chapter_exercises;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chapter_flashcards') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chapter_flashcards;
  END IF;
END $$;

-- ─── 7. Texte sans accents ni majuscules (recherche insensible aux accents, sans extension) ──
CREATE OR REPLACE FUNCTION public.pe_sans_accent(t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT replace(replace(translate(lower(coalesce(t, '')),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ',
    'aaaaaaceeeeiiiinooooouuuuyy'), 'œ', 'oe'), 'æ', 'ae')
$$;

-- ─── 8. Chapitres remplis d'une matière (une seule requête, droits de la personne connectée) ──
CREATE OR REPLACE FUNCTION public.chapitres_remplis(p_subject_id text)
RETURNS TABLE (chapter_id uuid, theme_id uuid, rempli boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT c.id, c.theme_id,
    (   coalesce(btrim(c.description), '') <> ''
     OR coalesce(btrim(c.revision), '') <> ''
     OR coalesce(cardinality(c.youtube_links), 0) > 0
     OR EXISTS (SELECT 1 FROM public.chapter_documents d WHERE d.chapter_id = c.id)
     OR EXISTS (SELECT 1 FROM public.quizzes z WHERE z.subject_id = c.id::text)
     OR EXISTS (SELECT 1 FROM public.chapter_exercises e WHERE e.chapter_id = c.id)
     OR EXISTS (SELECT 1 FROM public.chapter_flashcards f WHERE f.chapter_id = c.id)
    ) AS rempli
  FROM public.subject_chapters c
  WHERE c.subject_id = p_subject_id
$$;
GRANT EXECUTE ON FUNCTION public.chapitres_remplis(text) TO authenticated;

-- ─── 9. Recherche dans toute la bibliothèque (droits de la personne connectée) ──
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
    SELECT 'exercise', e.id, e.title, c.id, c.title, c.theme_id, t.title, c.subject_id
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
GRANT EXECUTE ON FUNCTION public.search_bibliotheque(text) TO authenticated;
