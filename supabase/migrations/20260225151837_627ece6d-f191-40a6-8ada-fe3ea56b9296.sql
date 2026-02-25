
-- Create a function that sends push notifications via the edge function when a notification is inserted
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
  notification_data JSONB;
BEGIN
  -- Build the notification data
  notification_data := jsonb_build_object(
    'userId', NEW.user_id::text,
    'title', NEW.title,
    'message', NEW.message,
    'data', jsonb_build_object(
      'type', NEW.type,
      'postId', NEW.post_id,
      'fromUserId', NEW.from_user_id,
      'commentId', NEW.comment_id
    )
  );

  -- Call the edge function using net extension
  PERFORM net.http_post(
    url := 'https://eqgouykzakjdmgmbnsca.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    )::jsonb,
    body := notification_data
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the notification insert if push fails
  RAISE WARNING 'Push notification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notifications;
CREATE TRIGGER trigger_send_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();
