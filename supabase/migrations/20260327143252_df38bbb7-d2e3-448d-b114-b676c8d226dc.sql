
-- Drop and recreate ALL RLS policies that reference auth.users to use auth.email() instead

-- ============ profiles ============
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
CREATE POLICY "Admin can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (auth.email() = 'nad341@live.fr');

-- ============ subject_content ============
DROP POLICY IF EXISTS "Admin can delete content" ON public.subject_content;
CREATE POLICY "Admin can delete content" ON public.subject_content FOR DELETE TO authenticated USING (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Admin can insert content" ON public.subject_content;
CREATE POLICY "Admin can insert content" ON public.subject_content FOR INSERT TO authenticated WITH CHECK (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Admin can update content" ON public.subject_content;
CREATE POLICY "Admin can update content" ON public.subject_content FOR UPDATE TO authenticated USING (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Anyone authenticated can read visible content" ON public.subject_content;
CREATE POLICY "Anyone authenticated can read visible content" ON public.subject_content FOR SELECT TO authenticated USING (is_visible = true OR auth.email() = 'nad341@live.fr');

-- ============ homework ============
DROP POLICY IF EXISTS "Admin can delete homework" ON public.homework;
CREATE POLICY "Admin can delete homework" ON public.homework FOR DELETE TO authenticated USING (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Admin can insert homework" ON public.homework;
CREATE POLICY "Admin can insert homework" ON public.homework FOR INSERT TO authenticated WITH CHECK (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Admin can update homework" ON public.homework;
CREATE POLICY "Admin can update homework" ON public.homework FOR UPDATE TO authenticated USING (auth.email() = 'nad341@live.fr');

-- ============ homework_completions ============
DROP POLICY IF EXISTS "Admin can read all completions" ON public.homework_completions;
CREATE POLICY "Admin can read all completions" ON public.homework_completions FOR SELECT TO authenticated USING (auth.email() = 'nad341@live.fr');

-- ============ tutoring_hours ============
DROP POLICY IF EXISTS "Admin can manage hours" ON public.tutoring_hours;
CREATE POLICY "Admin can manage hours" ON public.tutoring_hours FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Students can read own hours" ON public.tutoring_hours;
CREATE POLICY "Students can read own hours" ON public.tutoring_hours FOR SELECT TO authenticated USING (student_id = auth.uid() OR auth.email() = 'nad341@live.fr');

-- ============ notifications ============
DROP POLICY IF EXISTS "Admin can manage notifications" ON public.notifications;
CREATE POLICY "Admin can manage notifications" ON public.notifications FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Users can read notifications for them" ON public.notifications;
CREATE POLICY "Users can read notifications for them" ON public.notifications FOR SELECT TO authenticated USING (recipient_type = 'all' OR auth.uid() = ANY(recipient_ids) OR auth.email() = 'nad341@live.fr');

-- ============ family_accounts ============
DROP POLICY IF EXISTS "Admin can manage family" ON public.family_accounts;
CREATE POLICY "Admin can manage family" ON public.family_accounts FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Users can see family members" ON public.family_accounts;
CREATE POLICY "Users can see family members" ON public.family_accounts FOR SELECT TO authenticated USING (family_email = auth.email() OR member_user_id = auth.uid());

-- ============ quiz_questions ============
DROP POLICY IF EXISTS "Admin can manage questions" ON public.quiz_questions;
CREATE POLICY "Admin can manage questions" ON public.quiz_questions FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');

-- ============ quizzes ============
DROP POLICY IF EXISTS "Admin can manage quizzes" ON public.quizzes;
CREATE POLICY "Admin can manage quizzes" ON public.quizzes FOR ALL TO authenticated USING (auth.email() = 'nad341@live.fr');

-- ============ messages ============
DROP POLICY IF EXISTS "Users can read messages sent to them or all" ON public.messages;
CREATE POLICY "Users can read messages sent to them or all" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_type = 'all' OR auth.uid() = ANY(recipient_ids) OR auth.email() = 'nad341@live.fr');

-- ============ subject_documents ============
DROP POLICY IF EXISTS "Admin can delete documents" ON public.subject_documents;
CREATE POLICY "Admin can delete documents" ON public.subject_documents FOR DELETE TO authenticated USING (auth.email() = 'nad341@live.fr');

DROP POLICY IF EXISTS "Admin can insert documents" ON public.subject_documents;
CREATE POLICY "Admin can insert documents" ON public.subject_documents FOR INSERT TO authenticated WITH CHECK (auth.email() = 'nad341@live.fr');
