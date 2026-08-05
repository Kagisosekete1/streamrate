DROP TRIGGER IF EXISTS trigger_notify_post ON public.posts;
DROP TRIGGER IF EXISTS trigger_notify_view ON public.post_views;
DROP FUNCTION IF EXISTS public.notify_post();
DROP FUNCTION IF EXISTS public.notify_view();
DROP FUNCTION IF EXISTS public.notify_like();
DROP FUNCTION IF EXISTS public.notify_comment();
DROP FUNCTION IF EXISTS public.notify_user();