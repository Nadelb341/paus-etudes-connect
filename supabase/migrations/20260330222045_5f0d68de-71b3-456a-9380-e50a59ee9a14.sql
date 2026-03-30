
-- Subject chapters table
CREATE TABLE public.subject_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  youtube_links TEXT[] DEFAULT '{}',
  target_student_id UUID,
  order_index INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subject_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage chapters" ON public.subject_chapters FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');
CREATE POLICY "Students can read chapters" ON public.subject_chapters FOR SELECT TO authenticated USING (
  (target_student_id IS NULL) OR (target_student_id = auth.uid())
);

-- Subject comments table
CREATE TABLE public.subject_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id TEXT NOT NULL,
  chapter_id UUID REFERENCES public.subject_chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subject_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read comments" ON public.subject_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.subject_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.subject_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR auth.email() = 'nad341@live.fr');

-- Chapter documents table
CREATE TABLE public.chapter_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.subject_chapters(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chapter_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage chapter docs" ON public.chapter_documents FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');
CREATE POLICY "Students can read chapter docs" ON public.chapter_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students can insert chapter docs" ON public.chapter_documents FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Students can delete own chapter docs" ON public.chapter_documents FOR DELETE TO authenticated USING (uploaded_by = auth.uid());
