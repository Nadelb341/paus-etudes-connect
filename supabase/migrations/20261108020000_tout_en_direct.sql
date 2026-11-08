-- 2026-11-08 — « Tout en direct » (oui de Nadia) : les écrans s'abonnent à ces tables (hook useRealtimeRefresh).
-- RLS active sur toutes : chacun ne reçoit que ce qu'il a le droit de voir.
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.quizzes, public.subject_comments, public.subject_themes, public.admin_quick_notes, public.homework, public.homework_completions, public.subject_content, public.subject_chapters, public.chapter_documents, public.appointments, public.appointment_views, public.tutoring_hours, public.family_accounts, public.hourly_rate_settings, public.trash_items;
