
CREATE TABLE public.admin_quick_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_validated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_quick_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage quick notes"
  ON public.admin_quick_notes
  FOR ALL
  TO authenticated
  USING (auth.email() = 'nad341@live.fr')
  WITH CHECK (auth.email() = 'nad341@live.fr');
