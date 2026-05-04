-- Lock referral_code: once set, it cannot be changed (even if username/handle changes later).
CREATE OR REPLACE FUNCTION public.lock_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.referral_code IS NOT NULL AND OLD.referral_code <> '' THEN
    IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
      NEW.referral_code := OLD.referral_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_lock_referral_code ON public.profiles;
CREATE TRIGGER profiles_lock_referral_code
BEFORE UPDATE OF referral_code ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.lock_referral_code();