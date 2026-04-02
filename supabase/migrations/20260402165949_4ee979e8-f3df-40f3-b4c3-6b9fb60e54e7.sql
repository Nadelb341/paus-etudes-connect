
-- Add status column to appointments (active, postponed, cancelled)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS status_note text DEFAULT '';

-- Create trigger to notify parent when appointment status changes
CREATE OR REPLACE FUNCTION public.notify_appointment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_record RECORD;
  status_label TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('postponed', 'cancelled') THEN
    IF NEW.status = 'postponed' THEN
      status_label := '📅 RDV reporté';
    ELSE
      status_label := '❌ RDV annulé';
    END IF;

    -- Notify the student
    INSERT INTO public.scheduled_notifications (
      user_id, recipient_user_id, title, body,
      scheduled_at, notification_type, module, is_active, sent
    ) VALUES (
      COALESCE(NEW.created_by, auth.uid()), NEW.student_id,
      status_label,
      NEW.student_name || ' — ' || NEW.appointment_date || ' à ' || NEW.start_time || CASE WHEN NEW.status_note != '' THEN ' — ' || NEW.status_note ELSE '' END,
      NOW(), 'auto_rdv_status', 'general', true, false
    );

    -- Notify parent(s) linked to this student
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
        status_label,
        NEW.student_name || ' — ' || NEW.appointment_date || ' à ' || NEW.start_time || CASE WHEN NEW.status_note != '' THEN ' — ' || NEW.status_note ELSE '' END,
        NOW(), 'auto_rdv_status', 'general', true, false
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_status_change
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_status_change();
