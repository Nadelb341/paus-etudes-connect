
-- Profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  gender TEXT CHECK (gender IN ('Fille', 'Garçon')) DEFAULT 'Garçon',
  birth_date DATE,
  school_level TEXT NOT NULL DEFAULT '',
  remarks TEXT DEFAULT '',
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr'
);
CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr'
);
CREATE POLICY "Anyone authenticated can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, email, gender, birth_date, school_level, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'Garçon'),
    CASE WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL THEN (NEW.raw_user_meta_data->>'birth_date')::date ELSE NULL END,
    COALESCE(NEW.raw_user_meta_data->>'school_level', ''),
    CASE WHEN NEW.email = 'nad341@live.fr' THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subject content table
CREATE TABLE public.subject_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  youtube_links TEXT[] DEFAULT '{}',
  is_visible BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subject_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read visible content" ON public.subject_content FOR SELECT TO authenticated USING (is_visible = TRUE OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
CREATE POLICY "Admin can insert content" ON public.subject_content FOR INSERT TO authenticated WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
CREATE POLICY "Admin can update content" ON public.subject_content FOR UPDATE TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
CREATE POLICY "Admin can delete content" ON public.subject_content FOR DELETE TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Subject documents table
CREATE TABLE public.subject_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subject_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read documents" ON public.subject_documents FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin can insert documents" ON public.subject_documents FOR INSERT TO authenticated WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
CREATE POLICY "Admin can delete documents" ON public.subject_documents FOR DELETE TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Homework table
CREATE TABLE public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_levels TEXT[] DEFAULT '{}',
  target_student_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read homework" ON public.homework FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin can insert homework" ON public.homework FOR INSERT TO authenticated WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
CREATE POLICY "Admin can update homework" ON public.homework FOR UPDATE TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
CREATE POLICY "Admin can delete homework" ON public.homework FOR DELETE TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Homework completion tracking
CREATE TABLE public.homework_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES public.homework(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(homework_id, user_id)
);
ALTER TABLE public.homework_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own completions" ON public.homework_completions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own completions" ON public.homework_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own completions" ON public.homework_completions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own completions" ON public.homework_completions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can read all completions" ON public.homework_completions FOR SELECT TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT DEFAULT '',
  recipient_type TEXT CHECK (recipient_type IN ('all', 'group', 'individual')) NOT NULL DEFAULT 'all',
  recipient_ids UUID[] DEFAULT '{}',
  recipient_group TEXT DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
CREATE POLICY "Users can read messages sent to them or all" ON public.messages FOR SELECT TO authenticated USING (
  sender_id = auth.uid() OR recipient_type = 'all' OR auth.uid() = ANY(recipient_ids) OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr'
);
CREATE POLICY "Authenticated can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Sender can update own messages" ON public.messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Sender can delete own messages" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read quizzes" ON public.quizzes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin can manage quizzes" ON public.quizzes FOR ALL TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT '{}',
  correct_option INT NOT NULL DEFAULT 0,
  explanation TEXT DEFAULT '',
  order_index INT DEFAULT 0
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read questions" ON public.quiz_questions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin can manage questions" ON public.quiz_questions FOR ALL TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Quiz responses (for poll-like display)
CREATE TABLE public.quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  selected_option INT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 1,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_responses;
CREATE POLICY "Users can read all responses for poll" ON public.quiz_responses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can insert own response" ON public.quiz_responses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own response" ON public.quiz_responses FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Tutoring hours registry
CREATE TABLE public.tutoring_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL DEFAULT 1,
  hourly_rate NUMERIC(6,2) NOT NULL,
  subject TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutoring_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can read own hours" ON public.tutoring_hours FOR SELECT TO authenticated USING (student_id = auth.uid() OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
CREATE POLICY "Admin can manage hours" ON public.tutoring_hours FOR ALL TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_type TEXT CHECK (recipient_type IN ('all', 'group', 'individual')) NOT NULL DEFAULT 'all',
  recipient_ids UUID[] DEFAULT '{}',
  recipient_group TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
CREATE POLICY "Users can read notifications for them" ON public.notifications FOR SELECT TO authenticated USING (
  recipient_type = 'all' OR auth.uid() = ANY(recipient_ids) OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr'
);
CREATE POLICY "Admin can manage notifications" ON public.notifications FOR ALL TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Family accounts table for account switching
CREATE TABLE public.family_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_email TEXT NOT NULL,
  member_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_email TEXT NOT NULL,
  member_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.family_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see family members" ON public.family_accounts FOR SELECT TO authenticated USING (
  family_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR member_user_id = auth.uid()
);
CREATE POLICY "Admin can manage family" ON public.family_accounts FOR ALL TO authenticated USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');

-- Storage bucket for subject documents
INSERT INTO storage.buckets (id, name, public) VALUES ('subject-files', 'subject-files', true);
CREATE POLICY "Authenticated can read files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'subject-files');
CREATE POLICY "Admin can upload files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'subject-files' AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
CREATE POLICY "Admin can delete files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'subject-files' AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'nad341@live.fr');
