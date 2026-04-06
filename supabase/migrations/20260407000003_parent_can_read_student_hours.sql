-- Fix : les parents ne pouvaient pas voir les heures de soutien de l'élève lié.
-- Sans cette policy, tutoring_hours retournait 0 résultats pour un parent,
-- et la carte enfant dans ParentHome affichait "Aucune heure enregistrée".

CREATE POLICY "Parents can read linked student hours"
  ON public.tutoring_hours
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_child_cards pcc
      JOIN public.profiles p ON p.id = pcc.child_profile_id
      WHERE pcc.parent_user_id = auth.uid()
        AND p.user_id = tutoring_hours.student_id
    )
  );
