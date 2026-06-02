REVOKE EXECUTE ON FUNCTION public.is_seen_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_post_viewers(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_own_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_seen_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_post_viewers(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_own_post(uuid) TO authenticated, service_role;