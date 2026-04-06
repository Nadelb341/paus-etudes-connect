-- Fix : les parents ne pouvaient pas voir les RDV car ils n'avaient pas
-- le droit de lire le profil de l'élève lié (nécessaire pour résoudre
-- child_profile_id → user_id dans ParentHome.tsx → fetchChildCards).
--
-- Sans cette policy, linkedStudentUserIds restait vide et aucune
-- AppointmentsCard n'était affichée dans l'espace parent.

CREATE POLICY "Parents can read linked student profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_child_cards pcc
      WHERE pcc.parent_user_id = auth.uid()
        AND pcc.child_profile_id = profiles.id
    )
  );
