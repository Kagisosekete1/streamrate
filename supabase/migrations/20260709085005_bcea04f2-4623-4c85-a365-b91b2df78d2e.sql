
-- 1. Fix notifications table: add missing columns referenced by triggers and UI
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS comment_id uuid,
  ADD COLUMN IF NOT EXISTS reel_id uuid,
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- Enable RLS + policies on notifications (was off)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 2. Remove the duplicate comment_like trigger causing double notifications
DROP TRIGGER IF EXISTS on_comment_liked ON public.comment_likes;

-- 3. Add unique constraints to prevent duplicate likes
CREATE UNIQUE INDEX IF NOT EXISTS ux_comment_likes_user_comment
  ON public.comment_likes (user_id, comment_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_post_likes_user_post
  ON public.post_likes (user_id, post_id);

-- 4. post_shares table + trigger
CREATE TABLE IF NOT EXISTS public.post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.post_shares TO authenticated;
GRANT ALL ON public.post_shares TO service_role;

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post shares are viewable by everyone" ON public.post_shares;
CREATE POLICY "Post shares are viewable by everyone" ON public.post_shares
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can share posts" ON public.post_shares;
CREATE POLICY "Users can share posts" ON public.post_shares
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_shares_post ON public.post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user ON public.post_shares(user_id);

CREATE OR REPLACE FUNCTION public.notify_on_post_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  sharer_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(username, full_name, 'Someone') INTO sharer_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, post_id)
  VALUES (
    post_owner_id,
    NEW.user_id,
    'Post Shared',
    COALESCE(sharer_name, 'Someone') || ' shared your post',
    'post_share',
    NEW.post_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_shared ON public.post_shares;
CREATE TRIGGER on_post_shared
  AFTER INSERT ON public.post_shares
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_share();

-- 5. OneSignal / push dispatch logs (admin-only)
CREATE TABLE IF NOT EXISTS public.push_dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  notification_type text,
  title text,
  message text,
  deep_link text,
  status text NOT NULL,
  http_status int,
  error text,
  onesignal_id text,
  payload jsonb,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_dispatch_logs TO authenticated;
GRANT ALL ON public.push_dispatch_logs TO service_role;

ALTER TABLE public.push_dispatch_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only seen admin can view push logs" ON public.push_dispatch_logs;
CREATE POLICY "Only seen admin can view push logs" ON public.push_dispatch_logs
  FOR SELECT TO authenticated USING (public.is_seen_admin());

CREATE INDEX IF NOT EXISTS idx_push_dispatch_logs_created ON public.push_dispatch_logs (created_at DESC);

-- 6. Username -> full_name sync (overwrite full_name whenever username changes)
CREATE OR REPLACE FUNCTION public.sync_full_name_with_username()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NOT NULL AND NEW.username <> '' THEN
    IF TG_OP = 'INSERT' OR NEW.username IS DISTINCT FROM OLD.username THEN
      NEW.full_name := NEW.username;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_full_name_with_username ON public.profiles;
CREATE TRIGGER trg_sync_full_name_with_username
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_full_name_with_username();

-- Backfill existing profiles so full_name matches username
UPDATE public.profiles
SET full_name = username
WHERE username IS NOT NULL AND username <> '' AND (full_name IS DISTINCT FROM username);

-- 7. Enable realtime on notifications so bell/center get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
