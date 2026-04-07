-- Permet aux participants d'un message de mettre à jour les réactions (jsonb).
-- Un participant = l'expéditeur OU quelqu'un dans recipient_ids OU l'admin.

DROP POLICY IF EXISTS "Participants can update message reactions" ON public.messages;

CREATE POLICY "Participants can update message reactions"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    auth.email() = 'nad341@live.fr'
    OR sender_id = auth.uid()
    OR auth.uid() = ANY(recipient_ids)
  )
  WITH CHECK (
    auth.email() = 'nad341@live.fr'
    OR sender_id = auth.uid()
    OR auth.uid() = ANY(recipient_ids)
  );
