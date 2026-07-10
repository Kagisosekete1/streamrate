DROP TRIGGER IF EXISTS trg_notify_on_comment_like ON public.comment_likes;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
DROP TRIGGER IF EXISTS trg_notify_on_mention_in_comment ON public.comments;
DROP TRIGGER IF EXISTS trg_sync_comments_count_del ON public.comments;
DROP TRIGGER IF EXISTS trg_sync_comments_count_ins ON public.comments;
DROP TRIGGER IF EXISTS trg_sync_comments_count_upd ON public.comments;
DROP TRIGGER IF EXISTS trigger_decrease_comment_count ON public.comments;
DROP TRIGGER IF EXISTS trigger_notify_comment ON public.comments;
DROP TRIGGER IF EXISTS trigger_update_comment_count ON public.comments;

DROP TRIGGER IF EXISTS on_new_follow ON public.follows;
DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;

DROP TRIGGER IF EXISTS trg_send_push_on_notification ON public.notifications;
DROP TRIGGER IF EXISTS trigger_notify_push ON public.notifications;

DROP TRIGGER IF EXISTS trg_notify_on_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS trg_sync_post_likes_count_del ON public.post_likes;
DROP TRIGGER IF EXISTS trg_sync_post_likes_count_ins ON public.post_likes;
DROP TRIGGER IF EXISTS trigger_decrease_like_count ON public.post_likes;
DROP TRIGGER IF EXISTS trigger_notify_like ON public.post_likes;
DROP TRIGGER IF EXISTS trigger_update_like_count ON public.post_likes;

DROP TRIGGER IF EXISTS on_post_shared ON public.post_shares;
DROP TRIGGER IF EXISTS trg_notify_on_post_share ON public.post_shares;
DROP TRIGGER IF EXISTS trg_sync_post_shares_count_ins ON public.post_shares;

DROP TRIGGER IF EXISTS trg_notify_on_mention_in_reel_comment ON public.reel_comments;
DROP TRIGGER IF EXISTS trg_notify_on_reel_comment ON public.reel_comments;

DROP TRIGGER IF EXISTS trg_notify_on_reel_like ON public.reel_likes;