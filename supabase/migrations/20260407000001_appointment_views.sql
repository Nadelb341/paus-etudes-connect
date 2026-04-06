-- Table pour mémoriser quels RDV ont été vus (accusé de réception) par chaque utilisateur.
-- Tant qu'il n'y a pas de ligne pour (appointment_id, user_id), le message flash s'affiche.
-- Une fois que l'utilisateur clique OK, on insère une ligne et le message ne réapparaît plus.

CREATE TABLE public.appointment_views (
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL,
  viewed_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (appointment_id, user_id)
);

ALTER TABLE public.appointment_views ENABLE ROW LEVEL SECURITY;

-- Admin : accès total
CREATE POLICY "Admin manages appointment views"
  ON public.appointment_views FOR ALL TO authenticated
  USING (auth.email() = 'nad341@live.fr');

-- Chaque utilisateur peut lire et créer ses propres lignes
CREATE POLICY "Users manage own appointment views"
  ON public.appointment_views FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
