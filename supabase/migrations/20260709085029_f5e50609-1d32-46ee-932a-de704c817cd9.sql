
CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  payload := jsonb_build_object(
    'userId', NEW.user_id::text,
    'title', COALESCE(NEW.title, 'StreamRate'),
    'message', COALESCE(NEW.message, ''),
    'data', jsonb_build_object(
      'type', NEW.type,
      'postId', NEW.post_id,
      'reelId', NEW.reel_id,
      'commentId', NEW.comment_id,
      'fromUserId', NEW.from_user_id,
      'notificationId', NEW.id
    )
  );

  BEGIN
    PERFORM net.http_post(
      url := 'https://eqgouykzakjdmgmbnsca.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := payload
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_push failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
