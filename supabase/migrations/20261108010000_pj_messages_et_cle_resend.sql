-- 2026-11-08 — décisions de Nadia (1 oui, 3 oui)

-- 1. Pièces jointes des messages : chaque utilisateur connecté peut envoyer un fichier,
--    UNIQUEMENT dans son propre dossier messages/<son id>/ (l'admin garde sa règle à elle).
DROP POLICY IF EXISTS "Users can upload own message files" ON storage.objects;
CREATE POLICY "Users can upload own message files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'subject-files'
    AND (storage.foldername(name))[1] = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::text);

-- 2. Correction : les 2 règles admin du stockage (recréées le 2026-11-07) lisaient auth.users,
--    interdit au rôle « authenticated » → TOUT envoi/suppression de fichier échouait, admin comprise.
--    Même règle qu'avant, écrite avec auth.email() comme les autres règles de l'appli (migration du 2026-03-27).
DROP POLICY IF EXISTS "Admin can upload files" ON storage.objects;
CREATE POLICY "Admin can upload files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'subject-files' AND auth.email() = 'nad341@live.fr');
DROP POLICY IF EXISTS "Admin can delete files" ON storage.objects;
CREATE POLICY "Admin can delete files" ON storage.objects
  FOR DELETE USING (bucket_id = 'subject-files' AND auth.email() = 'nad341@live.fr');

-- 3. Clé Resend retirée de la base : ces 2 fonctions (envoi via pg_net, absent) ne servaient plus
--    et contenaient la clé en clair. Les e-mails partent par la fonction send-notifications (secret RESEND_API_KEY).
DROP FUNCTION IF EXISTS public.trigger_process_email_queue() CASCADE;
DROP FUNCTION IF EXISTS public.process_email_queue();
