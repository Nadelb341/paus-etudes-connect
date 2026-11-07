-- Bascule Lovable Cloud → Supabase indépendant (2026-11-07)
-- Ce qui n'est pas dans les tables « public » copiées par pg_dump, recréé à la main sur la nouvelle base.

-- 1. Inscription : chaque nouveau compte reçoit son profil (fonction handle_new_user déjà copiée)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Stockage des fichiers : même dossier public et mêmes règles que sur Lovable
INSERT INTO storage.buckets (id, name, public) VALUES ('subject-files', 'subject-files', true)
  ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Authenticated can read files" ON storage.objects;
CREATE POLICY "Authenticated can read files" ON storage.objects
  FOR SELECT USING (bucket_id = 'subject-files');
DROP POLICY IF EXISTS "Admin can upload files" ON storage.objects;
CREATE POLICY "Admin can upload files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'subject-files'
    AND (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text = 'nad341@live.fr');
DROP POLICY IF EXISTS "Admin can delete files" ON storage.objects;
CREATE POLICY "Admin can delete files" ON storage.objects
  FOR DELETE USING (bucket_id = 'subject-files'
    AND (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text = 'nad341@live.fr');

-- 3. Mises à jour en direct : mêmes 7 tables que sur Lovable
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.profiles, public.messages, public.quiz_responses, public.notifications,
  public.parent_child_cards, public.payment_tracking, public.homework_reminders;

-- 4. Corbeille (code déjà en place depuis le 2026-08-16, la table manquait)
CREATE TABLE IF NOT EXISTS public.trash_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  original_id text NOT NULL,
  label text NOT NULL DEFAULT '',
  deleted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trash_items_user_idx ON public.trash_items (user_id, deleted_at DESC);
ALTER TABLE public.trash_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trash_select_own" ON public.trash_items;
CREATE POLICY "trash_select_own" ON public.trash_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "trash_insert_own" ON public.trash_items;
CREATE POLICY "trash_insert_own" ON public.trash_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "trash_delete_own" ON public.trash_items;
CREATE POLICY "trash_delete_own" ON public.trash_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
GRANT SELECT, INSERT, DELETE ON public.trash_items TO authenticated;
