DROP TRIGGER IF EXISTS trg_notify_push ON public.notifications;
CREATE TRIGGER trg_notify_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_push();