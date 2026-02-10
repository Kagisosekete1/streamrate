-- Add signup_number column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_number serial;

-- Add gender column to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL;

-- Create a function to assign signup number on insert
CREATE OR REPLACE FUNCTION public.assign_signup_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Count existing profiles and assign next number
  SELECT COALESCE(MAX(signup_number), 0) + 1 INTO NEW.signup_number FROM public.profiles;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic signup number assignment
DROP TRIGGER IF EXISTS set_signup_number ON public.profiles;
CREATE TRIGGER set_signup_number
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_signup_number();