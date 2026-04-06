-- Table pour stocker le barème des tarifs horaires par niveau scolaire.
-- L'admin peut les modifier à tout moment depuis le dashboard.

CREATE TABLE public.hourly_rate_settings (
  id    text PRIMARY KEY,   -- 'primaire' | 'college' | 'lycee'
  label text NOT NULL,
  rate  numeric(10,2) NOT NULL
);

INSERT INTO public.hourly_rate_settings (id, label, rate) VALUES
  ('primaire', 'Maternelle → CM2',        10),
  ('college',  '6ème → 3ème',             13),
  ('lycee',    'Seconde → Terminale',      16);

ALTER TABLE public.hourly_rate_settings ENABLE ROW LEVEL SECURITY;

-- L'admin peut tout faire
CREATE POLICY "Admin manages rate settings"
  ON public.hourly_rate_settings FOR ALL TO authenticated
  USING (auth.email() = 'nad341@live.fr');

-- Tous les utilisateurs connectés peuvent lire le barème
CREATE POLICY "All can read rate settings"
  ON public.hourly_rate_settings FOR SELECT TO authenticated
  USING (true);

-- Colonne tarif personnalisé par élève (NULL = utiliser le barème par niveau)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_hourly_rate numeric(10,2) DEFAULT NULL;
