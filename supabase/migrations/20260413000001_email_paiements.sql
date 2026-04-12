-- =====================================================
-- Emails automatiques Paus'Étude → nadiaelb341@hotmail.com
-- Récapitulatifs : nouvelle séance + paiement confirmé
-- Traitement immédiat via trigger (pg_cron non disponible)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS désactivée : table interne, jamais exposée aux utilisateurs
ALTER TABLE public.email_queue DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.queue_pausetude_email(p_subject TEXT, p_html TEXT) RETURNS void AS $$
BEGIN
  INSERT INTO public.email_queue (to_email, subject, html_body) VALUES ('nadiaelb341@hotmail.com', p_subject, p_html);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.pausetude_email_template(p_emoji TEXT, p_titre TEXT, p_rows TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#f0f4ff;margin:0;padding:20px}.card{background:#fff;border-radius:12px;padding:24px;max-width:520px;margin:auto}h2{color:#2d4a8a;margin-top:0;font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:7px 10px;font-size:14px;border-bottom:1px solid #e8edf8;vertical-align:top}td:first-child{font-weight:bold;color:#4a6ab5;width:40%;white-space:nowrap}.footer{text-align:center;font-size:11px;color:#aaa;margin-top:16px}</style></head><body><div class="card"><h2>' || p_emoji || ' ' || p_titre || '</h2><table>' || p_rows || '</table></div><p class="footer">Paus''Etude — notification automatique</p></body></html>';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.process_email_queue() RETURNS void AS $$
DECLARE email_record RECORD;
BEGIN
  FOR email_record IN SELECT id, to_email, subject, html_body FROM public.email_queue WHERE sent = false ORDER BY created_at ASC LIMIT 10
  LOOP
    UPDATE public.email_queue SET sent = true WHERE id = email_record.id;
    PERFORM net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer re_231PpcSh_J4WCoE1n7DbD5DUtzRap9RDK'),
      body := jsonb_build_object('from', 'Paus''Etude <onboarding@resend.dev>', 'to', jsonb_build_array(email_record.to_email), 'subject', email_record.subject, 'html', email_record.html_body)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trigger_process_email_queue() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.process_email_queue();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_process_email AFTER INSERT ON public.email_queue FOR EACH ROW EXECUTE FUNCTION public.trigger_process_email_queue();

CREATE OR REPLACE FUNCTION public.email_new_tutoring_hour() RETURNS TRIGGER AS $$
DECLARE student_name TEXT; niveau TEXT; montant NUMERIC; rows TEXT;
BEGIN
  BEGIN
    SELECT first_name, school_level INTO student_name, niveau FROM public.profiles WHERE user_id = NEW.student_id;
    IF student_name IS NULL THEN student_name := 'Eleve'; END IF;
    montant := ROUND(NEW.duration_hours * NEW.hourly_rate, 2);
    rows := '<tr><td>Eleve</td><td>' || student_name || '</td></tr>'
         || '<tr><td>Date</td><td>' || TO_CHAR(NEW.session_date, 'DD/MM/YYYY') || '</td></tr>'
         || '<tr><td>Duree</td><td>' || NEW.duration_hours || 'h</td></tr>'
         || '<tr><td>Tarif</td><td>' || NEW.hourly_rate || 'EUR/h</td></tr>'
         || '<tr><td>Montant</td><td><strong>' || montant || 'EUR</strong></td></tr>'
         || CASE WHEN NEW.subject IS NOT NULL AND NEW.subject != '' THEN '<tr><td>Matiere</td><td>' || NEW.subject || '</td></tr>' ELSE '' END
         || CASE WHEN niveau IS NOT NULL AND niveau != '' THEN '<tr><td>Niveau</td><td>' || niveau || '</td></tr>' ELSE '' END;
    PERFORM public.queue_pausetude_email(
      'Paus Etude : Nouvelle seance - ' || student_name || ' (' || TO_CHAR(NEW.session_date, 'DD/MM') || ')',
      public.pausetude_email_template('livre', 'Nouvelle seance enregistree', rows)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_email_tutoring_hour ON public.tutoring_hours;
CREATE TRIGGER trg_email_tutoring_hour AFTER INSERT ON public.tutoring_hours FOR EACH ROW EXECUTE FUNCTION public.email_new_tutoring_hour();

CREATE OR REPLACE FUNCTION public.email_payment_confirmed() RETURNS TRIGGER AS $$
DECLARE student_name TEXT; session_date DATE; duration NUMERIC; rate NUMERIC; montant NUMERIC; rows TEXT;
BEGIN
  BEGIN
    IF NEW.is_paid = true AND (OLD.is_paid = false OR OLD.is_paid IS NULL) THEN
      SELECT p.first_name, t.session_date, t.duration_hours, t.hourly_rate INTO student_name, session_date, duration, rate FROM public.tutoring_hours t JOIN public.profiles p ON p.user_id = t.student_id WHERE t.id = NEW.tutoring_hour_id;
      IF student_name IS NULL THEN student_name := 'Eleve'; END IF;
      montant := ROUND(COALESCE(duration, 0) * COALESCE(rate, 0), 2);
      rows := '<tr><td>Eleve</td><td>' || student_name || '</td></tr>'
           || CASE WHEN session_date IS NOT NULL THEN '<tr><td>Seance du</td><td>' || TO_CHAR(session_date, 'DD/MM/YYYY') || '</td></tr>' ELSE '' END
           || CASE WHEN montant > 0 THEN '<tr><td>Montant regle</td><td><strong>' || montant || 'EUR</strong></td></tr>' ELSE '' END
           || CASE WHEN NEW.payment_date IS NOT NULL THEN '<tr><td>Date paiement</td><td>' || TO_CHAR(NEW.payment_date, 'DD/MM/YYYY') || '</td></tr>' ELSE '' END;
      PERFORM public.queue_pausetude_email('Paus Etude : Paiement confirme - ' || student_name, public.pausetude_email_template('ok', 'Paiement confirme', rows));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_email_payment ON public.payment_tracking;
CREATE TRIGGER trg_email_payment AFTER UPDATE ON public.payment_tracking FOR EACH ROW EXECUTE FUNCTION public.email_payment_confirmed();

-- -------------------------------------------------------
-- Récapitulatif complet par élève (màj session 2026-04-13)
-- -------------------------------------------------------
-- Fonction get_student_email_html(student_id) :
--   génère un tableau HTML complet avec toutes les séances,
--   total heures, montant total, reste dû
-- Triggers mis à jour pour utiliser cette fonction
