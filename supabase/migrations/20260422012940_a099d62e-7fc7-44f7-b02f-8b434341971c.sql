CREATE OR REPLACE FUNCTION public.capture_profile_qr_aliases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profile_qr_aliases (profile_id, alias, alias_type)
    VALUES (NEW.id, lower(NEW.id::text), 'user_id')
    ON CONFLICT (alias) DO NOTHING;

    INSERT INTO public.profile_qr_aliases (profile_id, alias, alias_type)
    VALUES (NEW.id, 'user-' || NEW.signup_number::text, 'signup_number')
    ON CONFLICT (alias) DO NOTHING;

    IF NEW.username IS NOT NULL AND length(NEW.username) >= 3 THEN
      INSERT INTO public.profile_qr_aliases (profile_id, alias, alias_type)
      VALUES (NEW.id, lower(NEW.username), 'username')
      ON CONFLICT (alias) DO NOTHING;
    END IF;
  ELSE
    IF OLD.username IS DISTINCT FROM NEW.username AND OLD.username IS NOT NULL AND length(OLD.username) >= 3 THEN
      INSERT INTO public.profile_qr_aliases (profile_id, alias, alias_type)
      VALUES (NEW.id, lower(OLD.username), 'username')
      ON CONFLICT (alias) DO NOTHING;
    END IF;

    IF OLD.qr_handle IS DISTINCT FROM NEW.qr_handle AND OLD.qr_handle IS NOT NULL AND length(OLD.qr_handle) >= 3 THEN
      INSERT INTO public.profile_qr_aliases (profile_id, alias, alias_type)
      VALUES (NEW.id, lower(OLD.qr_handle), 'legacy')
      ON CONFLICT (alias) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_profile_qr_aliases_update ON public.profiles;
CREATE TRIGGER capture_profile_qr_aliases_update
AFTER UPDATE OF username, qr_handle ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.capture_profile_qr_aliases();