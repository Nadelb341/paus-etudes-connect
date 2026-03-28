-- Add status column to profiles (parent or élève)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'élève';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('élève', 'parent'));

-- Add child_name column for parents to indicate their child's name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS child_name text DEFAULT '';

-- Update handle_new_user to include status and child_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, email, gender, birth_date, school_level, status, child_name, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.email, ''),
    CASE 
      WHEN LOWER(COALESCE(NEW.raw_user_meta_data->>'gender', '')) = 'fille' THEN 'Fille'
      WHEN LOWER(COALESCE(NEW.raw_user_meta_data->>'gender', '')) IN ('garcon', 'garçon') THEN 'Garçon'
      ELSE 'Garçon'
    END,
    CASE WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL THEN (NEW.raw_user_meta_data->>'birth_date')::date ELSE NULL END,
    COALESCE(NEW.raw_user_meta_data->>'school_level', ''),
    COALESCE(NEW.raw_user_meta_data->>'status', 'élève'),
    COALESCE(NEW.raw_user_meta_data->>'child_name', ''),
    CASE WHEN NEW.email = 'nad341@live.fr' THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$function$;

-- Enable realtime on profiles for instant updates in dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;