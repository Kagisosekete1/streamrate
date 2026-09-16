-- 1. Preserve legacy email-based verification badges as data
UPDATE public.profiles SET manual_verification_badge = 'red'
  WHERE lower(email) = 'kgsinnocent@gmail.com' AND manual_verification_badge IS NULL;
UPDATE public.profiles SET manual_verification_badge = 'blue'
  WHERE lower(email) = 'kagisosekete5@gmail.com' AND manual_verification_badge IS NULL;

-- 2. profiles.email: column-level grants excluding email
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='profiles' AND column_name <> 'email';

  REVOKE SELECT ON public.profiles FROM anon, authenticated;
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO anon, authenticated', cols);
END $$;

-- 3. connected_platforms: hide token columns from client roles
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='connected_platforms'
     AND column_name NOT IN ('access_token','refresh_token');

  REVOKE SELECT ON public.connected_platforms FROM anon, authenticated;
  EXECUTE format('GRANT SELECT (%s) ON public.connected_platforms TO authenticated', cols);
  -- writes: allow inserting/updating tokens the user owns (RLS still applies)
  GRANT INSERT, UPDATE, DELETE ON public.connected_platforms TO authenticated;
END $$;

-- 4. Lock down SECURITY DEFINER functions
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- Re-grant only what the app / RLS policies legitimately need
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_seen_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_who_can_comment(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_visibility(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_seller(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_viewers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_app_lock_pin(text) TO authenticated;