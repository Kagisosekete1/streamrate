BEGIN;
-- Preserve all legacy notifications; give only NULL IDs stable text UUIDs.
ALTER TABLE public.notifications ALTER COLUMN id SET DEFAULT (gen_random_uuid()::text);
UPDATE public.notifications SET id = gen_random_uuid()::text WHERE id IS NULL;
ALTER TABLE public.notifications ALTER COLUMN id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_id_push_uidx ON public.notifications (id);

ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS social_activity_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.push_dispatch_logs
  ADD COLUMN IF NOT EXISTS notification_id text REFERENCES public.notifications(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS push_dispatch_logs_notification_once_uidx
  ON public.push_dispatch_logs (notification_id)
  WHERE notification_id IS NOT NULL AND status = 'sent';

-- Direct client inserts cannot send an alert to another account. Notifications
-- for another user are created only by trusted SECURITY DEFINER event triggers.
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can only add own notifications" ON public.notifications;
CREATE POLICY "Users can only add own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id AND (from_user_id IS NULL OR from_user_id = auth.uid()::text));

-- Event notifications for request flows are generated from the real event rows.
CREATE OR REPLACE FUNCTION public.notify_on_co_stream_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT COALESCE(username, full_name, 'A streamer') INTO sender_name
  FROM public.profiles WHERE id = NEW.from_user_id;
  INSERT INTO public.notifications (user_id, from_user_id, type, title, message)
  VALUES (NEW.to_user_id, NEW.from_user_id, 'co_stream_request', 'Co-stream request',
    COALESCE(sender_name, 'A streamer') || ' wants to co-stream' || CASE WHEN COALESCE(NEW.game, '') = '' THEN '' ELSE ' ' || NEW.game END);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_co_stream_request ON public.co_stream_requests;
CREATE TRIGGER trg_notify_co_stream_request AFTER INSERT ON public.co_stream_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_co_stream_request();

CREATE OR REPLACE FUNCTION public.notify_on_co_stream_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  responder_name text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'The streamer') INTO responder_name
  FROM public.profiles WHERE id = NEW.to_user_id;
  INSERT INTO public.notifications (user_id, from_user_id, type, title, message)
  VALUES (NEW.from_user_id, NEW.to_user_id,
    CASE WHEN NEW.status = 'accepted' THEN 'co_stream_accepted' ELSE 'co_stream_response' END,
    CASE WHEN NEW.status = 'accepted' THEN 'Co-stream accepted' ELSE 'Co-stream request updated' END,
    COALESCE(responder_name, 'The streamer') || CASE WHEN NEW.status = 'accepted' THEN ' accepted your co-stream request' ELSE ' updated your co-stream request' END);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_co_stream_response ON public.co_stream_requests;
CREATE TRIGGER trg_notify_co_stream_response AFTER UPDATE OF status ON public.co_stream_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_co_stream_response();

CREATE OR REPLACE FUNCTION public.notify_on_stream_raid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT COALESCE(username, full_name, 'A streamer') INTO sender_name
  FROM public.profiles WHERE id = NEW.from_user_id;
  INSERT INTO public.notifications (user_id, from_user_id, type, title, message)
  VALUES (NEW.to_user_id, NEW.from_user_id, 'raid_incoming', 'Incoming raid!',
    COALESCE(sender_name, 'A streamer') || ' is sending ' || COALESCE(NEW.raider_count, 0)::text || ' raiders your way' || CASE WHEN COALESCE(NEW.message, '') = '' THEN '' ELSE ': ' || NEW.message END);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_on_stream_raid ON public.stream_raids;
CREATE TRIGGER trg_notify_on_stream_raid AFTER INSERT ON public.stream_raids
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_stream_raid();

CREATE TABLE IF NOT EXISTS public.squad_request_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);
ALTER TABLE public.squad_request_interests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.squad_request_interests TO authenticated;
GRANT ALL ON public.squad_request_interests TO service_role;
DROP POLICY IF EXISTS "Squad request interests viewable" ON public.squad_request_interests;
CREATE POLICY "Squad request interests viewable" ON public.squad_request_interests
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users express their own squad interest" ON public.squad_request_interests;
CREATE POLICY "Users express their own squad interest" ON public.squad_request_interests
  FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users remove their own squad interest" ON public.squad_request_interests;
CREATE POLICY "Users remove their own squad interest" ON public.squad_request_interests
  FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

CREATE OR REPLACE FUNCTION public.notify_on_squad_request_interest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  owner_id text;
  game_name text;
  actor_name text;
BEGIN
  SELECT user_id, game INTO owner_id, game_name
  FROM public.squad_requests WHERE id = NEW.request_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id::text THEN RETURN NEW; END IF;
  SELECT COALESCE(username, full_name, 'A player') INTO actor_name
  FROM public.profiles WHERE id = NEW.user_id::text;
  INSERT INTO public.notifications (user_id, from_user_id, type, title, message)
  VALUES (owner_id, NEW.user_id::text, 'lfg_response', 'Squad interest',
    COALESCE(actor_name, 'A player') || ' wants to squad up for ' || COALESCE(game_name, 'your game'));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_on_squad_request_interest ON public.squad_request_interests;
CREATE TRIGGER trg_notify_on_squad_request_interest AFTER INSERT ON public.squad_request_interests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_squad_request_interest();

-- A server-only webhook secret is read from Supabase Vault. The matching value
-- is also configured as the PUSH_WEBHOOK_SECRET Edge Function secret.
CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  webhook_secret text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.type IN ('profile_view', 'post_view', 'reel_view') THEN RETURN NEW; END IF;
  SELECT decrypted_secret INTO webhook_secret
  FROM vault.decrypted_secrets WHERE name = 'PUSH_WEBHOOK_SECRET' LIMIT 1;
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RAISE WARNING 'PUSH_WEBHOOK_SECRET is not configured in Supabase Vault';
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := 'https://oczrdiyvubwxttrrajhe.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-webhook-secret', webhook_secret
      ),
      body := jsonb_build_object('notificationId', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_push failed: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;
DROP TRIGGER IF EXISTS trg_send_push_on_notification ON public.notifications;
CREATE TRIGGER on_notification_send_push AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push();

CREATE OR REPLACE FUNCTION public.retry_push_notification(_notification_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  webhook_secret text;
  notification_exists boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_seen_admin() THEN
    RAISE EXCEPTION 'Not authorized to retry push notifications';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.notifications WHERE id = _notification_id) INTO notification_exists;
  IF NOT notification_exists THEN RETURN false; END IF;
  SELECT decrypted_secret INTO webhook_secret
    FROM vault.decrypted_secrets WHERE name = 'PUSH_WEBHOOK_SECRET' LIMIT 1;
  IF webhook_secret IS NULL OR webhook_secret = '' THEN
    RAISE EXCEPTION 'PUSH_WEBHOOK_SECRET is missing from Supabase Vault';
  END IF;
  PERFORM net.http_post(
    url := 'https://oczrdiyvubwxttrrajhe.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-webhook-secret', webhook_secret),
    body := jsonb_build_object('notificationId', _notification_id)
  );
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.retry_push_notification(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_push_notification(text) TO authenticated;

COMMIT;
