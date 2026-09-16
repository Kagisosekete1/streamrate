-- Compatibility objects required by the StreamRate client and RLS policies.
-- Uses role::text so it works whether user_roles.role is an enum or text.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id::text = _user_id::text
      AND role::text = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_seen_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id::text = auth.uid()::text
      AND lower(coalesce(email, '')) = 'kagisosekete5@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
  SELECT email::text
  FROM auth.users
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_seen_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_seen_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

-- Replace the temporary disabled policies used while has_role() was missing.
DROP POLICY IF EXISTS "Streamers create tournaments" ON public.tournaments;
CREATE POLICY "Streamers create tournaments"
ON public.tournaments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = host_user_id::text
  AND public.has_role(auth.uid(), 'streamer')
);

DROP POLICY IF EXISTS "Streamers send their own raids" ON public.stream_raids;
CREATE POLICY "Streamers send their own raids"
ON public.stream_raids FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = from_user_id::text
  AND public.has_role(auth.uid(), 'streamer')
);

DROP POLICY IF EXISTS "Streamers create co-stream requests" ON public.co_stream_requests;
CREATE POLICY "Streamers create co-stream requests"
ON public.co_stream_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = from_user_id::text
  AND public.has_role(auth.uid(), 'streamer')
);
