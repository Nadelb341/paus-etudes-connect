-- Fix the handle_new_user function to capitalize gender properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, email, gender, birth_date, school_level, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.email, ''),
    CASE 
      WHEN LOWER(COALESCE(NEW.raw_user_meta_data->>'gender', '')) = 'fille' THEN 'Fille'
      WHEN LOWER(COALESCE(NEW.raw_user_meta_data->>'gender', '')) = 'garcon' THEN 'Garçon'
      WHEN LOWER(COALESCE(NEW.raw_user_meta_data->>'gender', '')) = 'garçon' THEN 'Garçon'
      ELSE 'Garçon'
    END,
    CASE WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL THEN (NEW.raw_user_meta_data->>'birth_date')::date ELSE NULL END,
    COALESCE(NEW.raw_user_meta_data->>'school_level', ''),
    CASE WHEN NEW.email = 'nad341@live.fr' THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert missing profiles with corrected gender
INSERT INTO public.profiles (user_id, first_name, email, gender, birth_date, school_level, is_approved)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.email, ''),
  CASE 
    WHEN LOWER(COALESCE(u.raw_user_meta_data->>'gender', '')) = 'fille' THEN 'Fille'
    WHEN LOWER(COALESCE(u.raw_user_meta_data->>'gender', '')) IN ('garcon', 'garçon') THEN 'Garçon'
    ELSE 'Garçon'
  END,
  CASE WHEN u.raw_user_meta_data->>'birth_date' IS NOT NULL THEN (u.raw_user_meta_data->>'birth_date')::date ELSE NULL END,
  COALESCE(u.raw_user_meta_data->>'school_level', ''),
  CASE WHEN u.email = 'nad341@live.fr' THEN TRUE ELSE FALSE END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);