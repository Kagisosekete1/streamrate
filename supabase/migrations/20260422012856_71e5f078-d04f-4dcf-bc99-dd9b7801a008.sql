ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS qr_handle TEXT;

CREATE OR REPLACE FUNCTION public.normalize_qr_handle(_value TEXT, _fallback_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := lower(regexp_replace(coalesce(_value, ''), '[^a-z0-9_]+', '_', 'g'));
  cleaned := regexp_replace(cleaned, '_+', '_', 'g');
  cleaned := trim(both '_' from cleaned);

  IF cleaned = '' AND _fallback_id IS NOT NULL THEN
    cleaned := 'user_' || replace(_fallback_id::text, '-', '');
  END IF;

  IF cleaned ~ '^[0-9]' THEN
    cleaned := 'u_' || cleaned;
  END IF;

  RETURN left(cleaned, 30);
END;
$$;

UPDATE public.profiles
SET qr_handle = public.normalize_qr_handle(coalesce(username, 'user_' || signup_number::text, id::text), id)
WHERE qr_handle IS NULL;

WITH duplicate_handles AS (
  SELECT id,
         qr_handle,
         row_number() OVER (PARTITION BY qr_handle ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET qr_handle = left(d.qr_handle, 20) || '_' || substring(replace(p.id::text, '-', ''), 1, 8)
FROM duplicate_handles d
WHERE p.id = d.id AND d.rn > 1;

ALTER TABLE public.profiles
ALTER COLUMN qr_handle SET NOT NULL;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_qr_handle_format;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_qr_handle_format
CHECK (qr_handle ~ '^[a-z][a-z0-9_]{2,29}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_qr_handle_unique_idx
ON public.profiles (qr_handle);

CREATE TABLE IF NOT EXISTS public.profile_qr_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  alias TEXT NOT NULL,
  alias_type TEXT NOT NULL DEFAULT 'legacy',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profile_qr_aliases_alias_format CHECK (alias ~ '^[a-z0-9_-]{3,80}$'),
  CONSTRAINT profile_qr_aliases_alias_type_check CHECK (alias_type IN ('username', 'user_id', 'signup_number', 'legacy'))
);

ALTER TABLE public.profile_qr_aliases ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS profile_qr_aliases_alias_unique_idx
ON public.profile_qr_aliases (alias);

CREATE INDEX IF NOT EXISTS profile_qr_aliases_profile_id_idx
ON public.profile_qr_aliases (profile_id);

DROP POLICY IF EXISTS "Aliases are viewable by everyone" ON public.profile_qr_aliases;
CREATE POLICY "Aliases are viewable by everyone"
ON public.profile_qr_aliases
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can create their own aliases" ON public.profile_qr_aliases;
CREATE POLICY "Users can create their own aliases"
ON public.profile_qr_aliases
FOR INSERT
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update their own aliases" ON public.profile_qr_aliases;
CREATE POLICY "Users can update their own aliases"
ON public.profile_qr_aliases
FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_profile_qr_aliases_insert ON public.profiles;
CREATE TRIGGER capture_profile_qr_aliases_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.capture_profile_qr_aliases();

DROP TRIGGER IF EXISTS capture_profile_qr_aliases_update ON public.profiles;
CREATE TRIGGER capture_profile_qr_aliases_update
AFTER UPDATE OF username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.capture_profile_qr_aliases();

INSERT INTO public.profile_qr_aliases (profile_id, alias, alias_type)
SELECT id, lower(id::text), 'user_id'
FROM public.profiles
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.profile_qr_aliases (profile_id, alias, alias_type)
SELECT id, 'user-' || signup_number::text, 'signup_number'
FROM public.profiles
WHERE signup_number IS NOT NULL
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.profile_qr_aliases (profile_id, alias, alias_type)
SELECT id, lower(username), 'username'
FROM public.profiles
WHERE username IS NOT NULL AND length(username) >= 3
ON CONFLICT (alias) DO NOTHING;