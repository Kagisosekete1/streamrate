-- 1. Update trigger: prefer qr_handle/username for the referral code
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate text;
  suffix int := 0;
  final_code text;
BEGIN
  IF NEW.referral_code IS NOT NULL AND length(NEW.referral_code) > 0 THEN
    RETURN NEW;
  END IF;

  candidate := lower(coalesce(NEW.qr_handle, NEW.username, ''));
  candidate := regexp_replace(candidate, '[^a-z0-9_]+', '', 'g');

  IF candidate = '' OR length(candidate) < 3 THEN
    candidate := lower(substring(replace(NEW.id::text, '-', ''), 1, 10));
  END IF;

  candidate := left(candidate, 24);
  final_code := candidate;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(referral_code) = final_code AND id <> NEW.id) LOOP
    suffix := suffix + 1;
    final_code := left(candidate, 22) || suffix::text;
  END LOOP;

  NEW.referral_code := final_code;
  RETURN NEW;
END;
$$;

-- 2. Backfill: replace random hex referral codes with handle-based codes
DO $$
DECLARE
  r record;
  candidate text;
  suffix int;
  final_code text;
BEGIN
  FOR r IN
    SELECT id, qr_handle, username, referral_code
    FROM public.profiles
    WHERE referral_code ~ '^[0-9a-f]{10}$'
  LOOP
    candidate := lower(coalesce(r.qr_handle, r.username, ''));
    candidate := regexp_replace(candidate, '[^a-z0-9_]+', '', 'g');
    IF candidate = '' OR length(candidate) < 3 THEN
      CONTINUE;
    END IF;
    candidate := left(candidate, 24);
    final_code := candidate;
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(referral_code) = final_code AND id <> r.id) LOOP
      suffix := suffix + 1;
      final_code := left(candidate, 22) || suffix::text;
    END LOOP;
    UPDATE public.profiles SET referral_code = final_code WHERE id = r.id;
  END LOOP;
END $$;