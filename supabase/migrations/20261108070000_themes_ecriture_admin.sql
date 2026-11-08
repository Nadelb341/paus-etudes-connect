-- 2026-11-08 (OK de Nadia) : seuls les comptes admin peuvent créer / modifier / supprimer des grands thèmes.
-- Avant : « subject_themes_write » = ALL true → n'importe quel élève connecté pouvait le faire via l'API. La lecture reste ouverte.
DROP POLICY IF EXISTS "subject_themes_write" ON public.subject_themes;
CREATE POLICY "subject_themes_admin_write" ON public.subject_themes
  FOR ALL TO authenticated
  USING (auth.email() = 'nad341@live.fr')
  WITH CHECK (auth.email() = 'nad341@live.fr');
