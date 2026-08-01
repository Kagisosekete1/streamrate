DROP TRIGGER IF EXISTS on_comment_like ON public.comment_likes;
DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS on_post_share ON public.post_shares;
DROP TRIGGER IF EXISTS on_reel_comment ON public.reel_comments;
DROP TRIGGER IF EXISTS on_reel_like ON public.reel_likes;
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;