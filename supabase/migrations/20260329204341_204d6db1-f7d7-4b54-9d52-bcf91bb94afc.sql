-- Table for parent child cards (admin creates them manually)
CREATE TABLE public.parent_child_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL,
  child_name text NOT NULL DEFAULT '',
  child_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  general_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_child_cards ENABLE ROW LEVEL SECURITY;

-- Admin can manage all cards
CREATE POLICY "Admin can manage child cards" ON public.parent_child_cards
  FOR ALL TO authenticated
  USING (auth.email() = 'nad341@live.fr');

-- Parents can read their own cards
CREATE POLICY "Parents can read own child cards" ON public.parent_child_cards
  FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());

-- Payment tracking table linked to tutoring_hours
CREATE TABLE public.payment_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutoring_hour_id uuid REFERENCES public.tutoring_hours(id) ON DELETE CASCADE,
  parent_card_id uuid REFERENCES public.parent_child_cards(id) ON DELETE CASCADE,
  is_paid boolean DEFAULT false,
  payment_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage payments" ON public.payment_tracking
  FOR ALL TO authenticated
  USING (auth.email() = 'nad341@live.fr');

CREATE POLICY "Parents can read own payments" ON public.payment_tracking
  FOR SELECT TO authenticated
  USING (
    parent_card_id IN (
      SELECT id FROM public.parent_child_cards WHERE parent_user_id = auth.uid()
    )
  );

-- Allow students to insert documents (not just admin)
CREATE POLICY "Students can insert documents" ON public.subject_documents
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Allow students to delete their own documents
CREATE POLICY "Students can delete own documents" ON public.subject_documents
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Enable realtime for payment_tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_child_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_tracking;