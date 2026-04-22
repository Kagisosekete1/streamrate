ALTER TABLE public.profiles
ALTER COLUMN qr_handle DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.set_profile_qr_handle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_handle IS NULL OR NEW.qr_handle = '' THEN
    NEW.qr_handle := public.normalize_qr_handle(coalesce(NEW.username, 'user_' || coalesce(NEW.signup_number::text, ''), NEW.id::text), NEW.id);
  ELSE
    NEW.qr_handle := public.normalize_qr_handle(NEW.qr_handle, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_qr_handle_before_insert_update ON public.profiles;
CREATE TRIGGER set_profile_qr_handle_before_insert_update
BEFORE INSERT OR UPDATE OF qr_handle ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_qr_handle();

UPDATE public.profiles
SET qr_handle = public.normalize_qr_handle(qr_handle, id)
WHERE qr_handle IS NULL OR qr_handle = '';

ALTER TABLE public.profiles
ALTER COLUMN qr_handle SET NOT NULL;