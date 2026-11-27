-- Backfill old profiles that have no creation timestamp so Explore can classify
-- new accounts using the timestamp of the underlying Auth user.
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  qr_handle,
  created_at
)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'avatar_url',
  'user' || substring(replace(u.id::text, '-', ''), 1, 26),
  COALESCE(u.created_at, statement_timestamp())
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles AS p
SET created_at = u.created_at
FROM auth.users AS u
WHERE p.id = u.id
  AND p.created_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

-- Keep profile creation time aligned with the account creation time going
-- forward, including users created through Google OAuth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    qr_handle,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    'user' || substring(replace(NEW.id::text, '-', ''), 1, 26),
    COALESCE(NEW.created_at, statement_timestamp())
  )
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        qr_handle = COALESCE(public.profiles.qr_handle, EXCLUDED.qr_handle),
        created_at = COALESCE(public.profiles.created_at, EXCLUDED.created_at);

  RETURN NEW;
END;
$$;
