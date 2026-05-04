-- 1. App lock: server-side PIN verification, hide pin_hash from clients
CREATE OR REPLACE FUNCTION public.verify_app_lock_pin(_pin_hash text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_lock_settings
    WHERE user_id = auth.uid()
      AND is_enabled = true
      AND pin_hash = _pin_hash
  );
$$;

REVOKE SELECT (pin_hash) ON public.app_lock_settings FROM anon, authenticated;

-- 2. Connected platforms: never expose OAuth tokens to clients
REVOKE SELECT (access_token, refresh_token) ON public.connected_platforms FROM anon, authenticated;
REVOKE UPDATE (access_token, refresh_token) ON public.connected_platforms FROM anon, authenticated;
REVOKE INSERT (access_token, refresh_token) ON public.connected_platforms FROM anon, authenticated;