-- RLS : les parents peuvent lire les RDV de leurs enfants liés
CREATE POLICY "Parents can read linked children appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_child_cards pcc
      JOIN public.profiles p ON p.id = pcc.child_profile_id
      WHERE pcc.parent_user_id = auth.uid()
        AND p.user_id = appointments.student_id
    )
    AND is_visible = true
  );

-- Mettre à jour notify_new_appointment() pour aussi notifier les parents
CREATE OR REPLACE FUNCTION public.notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  subj_list TEXT;
  parent_record RECORD;
BEGIN
  subj_list := array_to_string(NEW.subjects, ', ');

  -- Notifier l'élève concerné
  IF NEW.student_id IS NOT NULL AND NEW.created_by IS NOT NULL AND NEW.student_id != NEW.created_by THEN
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

  -- Notifier les parents liés à cet élève
  FOR parent_record IN
    SELECT pcc.parent_user_id
    FROM public.parent_child_cards pcc
    JOIN public.profiles p ON p.id = pcc.child_profile_id
    WHERE p.user_id = NEW.student_id
  LOOP
    INSERT INTO public.scheduled_notifications (
      user_id, recipient_user_id, title, body,
      scheduled_at, notification_type, module, is_active, sent
    ) VALUES (
      COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid),
      parent_record.parent_user_id,
      '📅 Nouveau RDV pour votre enfant',
      NEW.student_name || ' — ' || subj_list || ' — ' || NEW.appointment_date || ' à ' || NEW.start_time,
      NOW(), 'auto_rdv', 'general', true, false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour notify_appointment_status_change() pour inclure la nouvelle date en cas de report
CREATE OR REPLACE FUNCTION public.notify_appointment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_record RECORD;
  status_label TEXT;
  body_text TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('postponed', 'cancelled') THEN
    IF NEW.status = 'postponed' THEN
      status_label := '📅 RDV reporté';
      body_text := NEW.student_name || ' — Nouveau : ' || NEW.appointment_date || ' à ' || NEW.start_time;
      IF NEW.status_note != '' THEN
        body_text := body_text || ' — ' || NEW.status_note;
      END IF;
    ELSE
      status_label := '❌ RDV annulé';
      body_text := NEW.student_name || ' — ' || OLD.appointment_date || ' à ' || OLD.start_time;
      IF NEW.status_note != '' THEN
        body_text := body_text || ' — ' || NEW.status_note;
      END IF;
    END IF;

    -- Notifier l'élève
    INSERT INTO public.scheduled_notifications (
      user_id, recipient_user_id, title, body,
      scheduled_at, notification_type, module, is_active, sent
    ) VALUES (
      COALESCE(NEW.created_by, auth.uid()), NEW.student_id,
      status_label, body_text,
      NOW(), 'auto_rdv_status', 'general', true, false
    );

    -- Notifier les parents liés
    FOR parent_record IN
      SELECT pcc.parent_user_id
      FROM public.parent_child_cards pcc
      JOIN public.profiles p ON p.id = pcc.child_profile_id
      WHERE p.user_id = NEW.student_id
    LOOP
      INSERT INTO public.scheduled_notifications (
        user_id, recipient_user_id, title, body,
        scheduled_at, notification_type, module, is_active, sent
      ) VALUES (
        COALESCE(NEW.created_by, auth.uid()), parent_record.parent_user_id,
        status_label, body_text,
        NOW(), 'auto_rdv_status', 'general', true, false
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
