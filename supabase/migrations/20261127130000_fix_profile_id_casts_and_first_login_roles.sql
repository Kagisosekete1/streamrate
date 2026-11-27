-- Auth user IDs are UUIDs while this project's profiles.id may be TEXT.
-- Keep comparisons explicit and cast IDs to the actual profiles.id type on insert.
DO $migration$
DECLARE
  profile_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO profile_id_type
  FROM pg_attribute AS a
  WHERE a.attrelid = 'public.profiles'::regclass
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF profile_id_type IS NULL THEN
    RAISE EXCEPTION 'public.profiles.id was not found';
  END IF;

  EXECUTE format(
    'INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at)
     SELECT (u.id::text)::%s,
            u.email,
            COALESCE(u.raw_user_meta_data ->> ''full_name'', u.raw_user_meta_data ->> ''name''),
            u.raw_user_meta_data ->> ''avatar_url'',
            COALESCE(u.created_at, statement_timestamp())
     FROM auth.users AS u
     WHERE NOT EXISTS (
       SELECT 1 FROM public.profiles AS p WHERE p.id::text = u.id::text
     )
     ON CONFLICT (id) DO NOTHING',
    profile_id_type
  );
END;
$migration$;

-- Restore the account's original Auth creation time when profile timestamps are absent.
UPDATE public.profiles AS p
SET created_at = u.created_at
FROM auth.users AS u
WHERE p.id::text = u.id::text
  AND p.created_at IS NULL;

UPDATE public.profiles
SET created_at = statement_timestamp()
WHERE created_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

-- Keep automatic profile creation working whether profiles.id is TEXT or UUID.
-- A signup role in auth metadata is saved before email confirmation as well.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  profile_id_type text;
  roles_user_id_type text;
  roles_role_type text;
  requested_role text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO profile_id_type
  FROM pg_attribute AS a
  WHERE a.attrelid = 'public.profiles'::regclass
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  EXECUTE format(
    'INSERT INTO public.profiles (id, email, full_name, avatar_url, gender, created_at)
     VALUES (($1)::%s, $2, $3, $4, $5, COALESCE($6, statement_timestamp()))
     ON CONFLICT (id) DO UPDATE
       SET email = COALESCE(EXCLUDED.email, public.profiles.email),
           full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
           avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
           gender = COALESCE(EXCLUDED.gender, public.profiles.gender),
           created_at = COALESCE(public.profiles.created_at, EXCLUDED.created_at)',
    profile_id_type
  ) USING
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'gender',
    NEW.created_at;

  requested_role := lower(COALESCE(NEW.raw_user_meta_data ->> 'app_role', ''));
  IF requested_role IN ('fan', 'streamer', 'seller') THEN
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO roles_user_id_type
    FROM pg_attribute AS a
    WHERE a.attrelid = 'public.user_roles'::regclass
      AND a.attname = 'user_id'
      AND NOT a.attisdropped;

    SELECT format_type(a.atttypid, a.atttypmod)
      INTO roles_role_type
    FROM pg_attribute AS a
    WHERE a.attrelid = 'public.user_roles'::regclass
      AND a.attname = 'role'
      AND NOT a.attisdropped;

    EXECUTE format(
      'INSERT INTO public.user_roles (user_id, role)
       VALUES (($1)::%s, ($2)::%s)
       ON CONFLICT DO NOTHING',
      roles_user_id_type,
      roles_role_type
    ) USING NEW.id::text, requested_role;
  END IF;

  RETURN NEW;
END;
$function$;

-- qr_handle is required in this schema. The helper takes a UUID fallback even
-- when profiles.id is TEXT, so convert the UUID-shaped Auth ID explicitly.
CREATE OR REPLACE FUNCTION public.set_profile_qr_handle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.qr_handle IS NULL OR NEW.qr_handle = '' THEN
    NEW.qr_handle := public.normalize_qr_handle(
      COALESCE(NEW.username, 'user_' || COALESCE(NEW.signup_number::text, ''), NEW.id::text),
      NEW.id::uuid
    );
  ELSE
    NEW.qr_handle := public.normalize_qr_handle(NEW.qr_handle, NEW.id::uuid);
  END IF;
  RETURN NEW;
END;
$function$;

DO $trigger$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass
      AND tgname = 'set_profile_qr_handle_before_insert_update'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER set_profile_qr_handle_before_insert_update
    BEFORE INSERT OR UPDATE OF qr_handle ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_profile_qr_handle();
  END IF;
END;
$trigger$;

-- Called only after login for existing accounts that do not yet have a role.
-- A transaction-scoped per-user lock makes the one-time choice race-safe.
CREATE OR REPLACE FUNCTION public.choose_my_role_once(_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  roles_user_id_type text;
  roles_role_type text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF lower(_role) NOT IN ('fan', 'streamer', 'seller') THEN
    RAISE EXCEPTION 'Invalid account role' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.user_roles AS r
    WHERE r.user_id::text = current_user_id::text
  ) THEN
    RETURN false;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO roles_user_id_type
  FROM pg_attribute AS a
  WHERE a.attrelid = 'public.user_roles'::regclass
    AND a.attname = 'user_id'
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO roles_role_type
  FROM pg_attribute AS a
  WHERE a.attrelid = 'public.user_roles'::regclass
    AND a.attname = 'role'
    AND NOT a.attisdropped;

  EXECUTE format(
    'INSERT INTO public.user_roles (user_id, role)
     VALUES (($1)::%s, ($2)::%s)',
    roles_user_id_type,
    roles_role_type
  ) USING current_user_id::text, lower(_role);

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.choose_my_role_once(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.choose_my_role_once(text) TO authenticated;
