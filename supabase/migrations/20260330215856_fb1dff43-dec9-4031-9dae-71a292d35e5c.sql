
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  estimated_duration TEXT NOT NULL DEFAULT '1h',
  items_to_bring TEXT DEFAULT '',
  seen_by_student BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage appointments" ON public.appointments FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');
CREATE POLICY "Students can read own appointments" ON public.appointments FOR SELECT TO authenticated USING (student_id = auth.uid() AND is_visible = true);
CREATE POLICY "Students can update own appointments" ON public.appointments FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
