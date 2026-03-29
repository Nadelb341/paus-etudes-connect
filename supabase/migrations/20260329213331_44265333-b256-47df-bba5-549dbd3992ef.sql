
-- 1. Homework reminders table (for relance system)
CREATE TABLE IF NOT EXISTS public.homework_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL,
  student_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz
);
ALTER TABLE public.homework_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage reminders" ON public.homework_reminders FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');
CREATE POLICY "Students can read own reminders" ON public.homework_reminders FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students can update own reminders" ON public.homework_reminders FOR UPDATE TO authenticated USING (student_id = auth.uid());

-- 2. Track note on tutoring hours
ALTER TABLE public.tutoring_hours ADD COLUMN IF NOT EXISTS track_note boolean DEFAULT false;

-- 3. Per-student subject content
ALTER TABLE public.subject_content ADD COLUMN IF NOT EXISTS target_student_id uuid;
ALTER TABLE public.subject_documents ADD COLUMN IF NOT EXISTS target_student_id uuid;

-- 4. Update RLS for per-student filtering on subject_content
DROP POLICY IF EXISTS "Anyone authenticated can read visible content" ON public.subject_content;
CREATE POLICY "Filtered read for content" ON public.subject_content
  FOR SELECT TO authenticated
  USING (
    (auth.email() = 'nad341@live.fr') 
    OR (is_visible = true AND (target_student_id IS NULL OR target_student_id = auth.uid()))
  );

-- 5. Update RLS for per-student filtering on subject_documents
DROP POLICY IF EXISTS "Authenticated can read documents" ON public.subject_documents;
CREATE POLICY "Filtered read for documents" ON public.subject_documents
  FOR SELECT TO authenticated
  USING (
    (auth.email() = 'nad341@live.fr')
    OR (target_student_id IS NULL OR target_student_id = auth.uid())
  );

-- 6. Enable realtime for homework_reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_reminders;
