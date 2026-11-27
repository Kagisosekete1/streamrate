-- Add Gamer as a standard account role while leaving administrative roles intact.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gamer';

-- The existing signup trigger already handles Fan, Streamer, and Seller.
-- Add Gamer through a compatible companion trigger without replacing that logic.
CREATE OR REPLACE FUNCTION public.handle_gamer_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  user_id_type text;
  role_type text;
BEGIN
  IF lower(COALESCE(NEW.raw_user_meta_data ->> 'app_role', '')) = 'gamer' THEN
    SELECT format_type(a.atttypid, a.atttypmod) INTO user_id_type
    FROM pg_attribute AS a
    WHERE a.attrelid = 'public.user_roles'::regclass
      AND a.attname = 'user_id' AND NOT a.attisdropped;

    SELECT format_type(a.atttypid, a.atttypmod) INTO role_type
    FROM pg_attribute AS a
    WHERE a.attrelid = 'public.user_roles'::regclass
      AND a.attname = 'role' AND NOT a.attisdropped;

    EXECUTE format(
      'INSERT INTO public.user_roles (user_id, role)
       VALUES (($1)::%s, ($2)::%s)
       ON CONFLICT DO NOTHING',
      user_id_type,
      role_type
    ) USING NEW.id::text, 'gamer';
  END IF;
  RETURN NEW;
END;
$function$;

DO $trigger$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'handle_gamer_role_on_signup'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER handle_gamer_role_on_signup
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_gamer_role_on_signup();
  END IF;
END;
$trigger$;

-- A single audit row permanently records each account's one role change.
CREATE TABLE IF NOT EXISTS public.user_role_change_log (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_role text,
  new_role text NOT NULL CHECK (new_role IN ('fan', 'streamer', 'gamer', 'seller')),
  changed_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

ALTER TABLE public.user_role_change_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_role_change_log FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_used_my_role_change()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_role_change_log AS l WHERE l.user_id = current_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.change_my_role_once(_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  selected_role text := lower(trim(_role));
  previous_role text;
  user_id_type text;
  role_type text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF selected_role NOT IN ('fan', 'streamer', 'gamer', 'seller') THEN
    RAISE EXCEPTION 'Choose Fan, Streamer, Gamer, or Seller' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.user_roles AS r
    WHERE r.user_id::text = current_user_id::text AND r.role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Administrator roles cannot be changed here' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_role_change_log AS l WHERE l.user_id = current_user_id
  ) THEN
    RETURN false;
  END IF;

  SELECT r.role::text INTO previous_role
  FROM public.user_roles AS r
  WHERE r.user_id::text = current_user_id::text
    AND r.role::text IN ('fan', 'streamer', 'gamer', 'seller')
  ORDER BY r.id::text
  LIMIT 1;

  -- Selecting the current role is a no-op and does not use the one-time change.
  IF previous_role = selected_role THEN
    RETURN true;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO user_id_type
  FROM pg_attribute AS a
  WHERE a.attrelid = 'public.user_roles'::regclass
    AND a.attname = 'user_id' AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod) INTO role_type
  FROM pg_attribute AS a
  WHERE a.attrelid = 'public.user_roles'::regclass
    AND a.attname = 'role' AND NOT a.attisdropped;

  IF user_id_type IS NULL OR role_type IS NULL THEN
    RAISE EXCEPTION 'The account role table is not configured';
  END IF;

  DELETE FROM public.user_roles AS r
  WHERE r.user_id::text = current_user_id::text
    AND r.role::text IN ('fan', 'streamer', 'gamer', 'seller');

  EXECUTE format(
    'INSERT INTO public.user_roles (user_id, role) VALUES (($1)::%s, ($2)::%s)',
    user_id_type,
    role_type
  ) USING current_user_id::text, selected_role;

  INSERT INTO public.user_role_change_log (user_id, previous_role, new_role)
  VALUES (current_user_id, previous_role, selected_role);

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.has_used_my_role_change() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.change_my_role_once(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_used_my_role_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_my_role_once(text) TO authenticated;

-- Existing OAuth accounts without a role can now choose any of the four roles.
CREATE OR REPLACE FUNCTION public.choose_my_role_once(_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  selected_role text := lower(trim(_role));
  user_id_type text;
  role_type text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF selected_role NOT IN ('fan', 'streamer', 'gamer', 'seller') THEN
    RAISE EXCEPTION 'Choose Fan, Streamer, Gamer, or Seller' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.user_roles AS r
    WHERE r.user_id::text = current_user_id::text
  ) THEN
    RETURN false;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO user_id_type
  FROM pg_attribute AS a
  WHERE a.attrelid = 'public.user_roles'::regclass
    AND a.attname = 'user_id' AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod) INTO role_type
  FROM pg_attribute AS a
  WHERE a.attrelid = 'public.user_roles'::regclass
    AND a.attname = 'role' AND NOT a.attisdropped;

  EXECUTE format(
    'INSERT INTO public.user_roles (user_id, role) VALUES (($1)::%s, ($2)::%s) ON CONFLICT DO NOTHING',
    user_id_type,
    role_type
  ) USING current_user_id::text, selected_role;

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.choose_my_role_once(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.choose_my_role_once(text) TO authenticated;
