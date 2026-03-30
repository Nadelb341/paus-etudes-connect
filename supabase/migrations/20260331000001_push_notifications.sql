-- =====================================================
-- NOTIFICATIONS PUSH — Tables + RLS + Triggers
-- Adapté pour Paus'Etudes (schéma spécifique)
-- =====================================================

-- 1. Table des abonnements push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 2. Table des notifications push programmées
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) DEFAULT NULL,
  title TEXT NOT NULL,
  body TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notification_type TEXT DEFAULT 'manual',
  module TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can insert scheduled notifs" ON public.scheduled_notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view own or targeted scheduled notifs" ON public.scheduled_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = recipient_user_id);
CREATE POLICY "Users can update own scheduled notifs" ON public.scheduled_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scheduled notifs" ON public.scheduled_notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Trigger : notification push quand un message est envoyé
-- Table messages : sender_id, sender_name, content, recipient_ids, recipient_type
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender TEXT;
  recipient UUID;
BEGIN
  sender := COALESCE(NEW.sender_name, 'Quelqu''un');

  IF NEW.recipient_type = 'all' THEN
    -- Broadcast : notifier tous les utilisateurs sauf l'expéditeur
    FOR recipient IN
      SELECT user_id FROM public.profiles WHERE user_id != NEW.sender_id
    LOOP
      INSERT INTO public.scheduled_notifications (
        user_id, recipient_user_id, title, body,
        scheduled_at, notification_type, module, is_active, sent
      ) VALUES (
        NEW.sender_id, recipient,
        '💬 ' || sender,
        LEFT(NEW.content, 100),
        NOW(), 'auto_message', 'messages', true, false
      );
    END LOOP;
  ELSIF NEW.recipient_ids IS NOT NULL THEN
    -- Message individuel : notifier chaque destinataire
    FOREACH recipient IN ARRAY NEW.recipient_ids
    LOOP
      INSERT INTO public.scheduled_notifications (
        user_id, recipient_user_id, title, body,
        scheduled_at, notification_type, module, is_active, sent
      ) VALUES (
        NEW.sender_id, recipient,
        '💬 ' || sender,
        LEFT(NEW.content, 100),
        NOW(), 'auto_message', 'messages', true, false
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- 4. Trigger : notification quand un RDV est créé pour un élève
-- Table appointments : student_id, student_name, appointment_date, start_time, subjects
CREATE OR REPLACE FUNCTION public.notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  subj_list TEXT;
BEGIN
  -- Notifier l'élève concerné
  IF NEW.student_id IS NOT NULL AND NEW.created_by IS NOT NULL AND NEW.student_id != NEW.created_by THEN
    subj_list := array_to_string(NEW.subjects, ', ');
    INSERT INTO public.scheduled_notifications (
      user_id, recipient_user_id, title, body,
      scheduled_at, notification_type, module, is_active, sent
    ) VALUES (
      NEW.created_by, NEW.student_id,
      '📅 Nouveau RDV',
      subj_list || ' — ' || NEW.appointment_date || ' à ' || NEW.start_time,
      NOW(), 'auto_rdv', 'general', true, false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_appointment ON public.appointments;
CREATE TRIGGER trg_notify_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_appointment();

-- 5. Trigger : notification quand un devoir est créé
CREATE OR REPLACE FUNCTION public.notify_new_homework()
RETURNS TRIGGER AS $$
DECLARE
  student RECORD;
BEGIN
  IF NEW.target_student_ids IS NOT NULL THEN
    -- Notifier les élèves ciblés
    FOR student IN
      SELECT unnest(NEW.target_student_ids::uuid[]) AS uid
    LOOP
      INSERT INTO public.scheduled_notifications (
        user_id, recipient_user_id, title, body,
        scheduled_at, notification_type, module, is_active, sent
      ) VALUES (
        COALESCE(NEW.created_by, auth.uid()), student.uid,
        '📝 Nouveau devoir',
        NEW.title || ' — pour le ' || NEW.due_date,
        NOW(), 'auto_homework', 'general', true, false
      );
    END LOOP;
  ELSE
    -- Notifier tous les élèves
    FOR student IN
      SELECT user_id AS uid FROM public.profiles WHERE status = 'élève' AND is_approved = true
    LOOP
      INSERT INTO public.scheduled_notifications (
        user_id, recipient_user_id, title, body,
        scheduled_at, notification_type, module, is_active, sent
      ) VALUES (
        COALESCE(NEW.created_by, auth.uid()), student.uid,
        '📝 Nouveau devoir',
        NEW.title || ' — pour le ' || NEW.due_date,
        NOW(), 'auto_homework', 'general', true, false
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_homework ON public.homework;
CREATE TRIGGER trg_notify_homework
  AFTER INSERT ON public.homework
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_homework();

-- 6. Trigger : notification quand un rappel de devoir est envoyé
CREATE OR REPLACE FUNCTION public.notify_homework_reminder()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.scheduled_notifications (
    user_id, recipient_user_id, title, body,
    scheduled_at, notification_type, module, is_active, sent
  ) VALUES (
    auth.uid(), NEW.student_id,
    '⏰ Rappel devoir',
    NEW.message,
    NOW(), 'auto_reminder', 'general', true, false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_homework_reminder ON public.homework_reminders;
CREATE TRIGGER trg_notify_homework_reminder
  AFTER INSERT ON public.homework_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_homework_reminder();
