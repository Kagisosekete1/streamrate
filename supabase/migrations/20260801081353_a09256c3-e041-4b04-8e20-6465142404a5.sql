CREATE TABLE public.reel_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  destination text NOT NULL DEFAULT 'native',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.reel_shares TO authenticated;
GRANT ALL ON public.reel_shares TO service_role;
ALTER TABLE public.reel_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view reel shares"
ON public.reel_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can share reels"
ON public.reel_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reel shares"
ON public.reel_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS post_likes_post_user_unique ON public.post_likes(post_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS comment_likes_comment_user_unique ON public.comment_likes(comment_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS reel_likes_reel_user_unique ON public.reel_likes(reel_id, user_id);

CREATE OR REPLACE FUNCTION public.create_reel_share_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  actor_name := public.notification_actor_name(NEW.user_id);
  INSERT INTO public.notifications (user_id, from_user_id, reel_id, type, title, message)
  VALUES (owner_id, NEW.user_id, NEW.reel_id, 'reel_share', 'New reel share', actor_name || ' shared your reel');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_like_notification ON public.post_likes;
CREATE TRIGGER trg_post_like_notification AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.create_post_like_notification();
DROP TRIGGER IF EXISTS trg_comment_interaction_notification ON public.comments;
CREATE TRIGGER trg_comment_interaction_notification AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.create_comment_interaction_notification();
DROP TRIGGER IF EXISTS trg_comment_like_notification ON public.comment_likes;
CREATE TRIGGER trg_comment_like_notification AFTER INSERT ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.create_comment_like_notification();
DROP TRIGGER IF EXISTS trg_post_share_notification ON public.post_shares;
CREATE TRIGGER trg_post_share_notification AFTER INSERT ON public.post_shares FOR EACH ROW EXECUTE FUNCTION public.create_post_share_notification();
DROP TRIGGER IF EXISTS trg_reel_like_notification ON public.reel_likes;
CREATE TRIGGER trg_reel_like_notification AFTER INSERT ON public.reel_likes FOR EACH ROW EXECUTE FUNCTION public.create_reel_like_notification();
DROP TRIGGER IF EXISTS trg_reel_comment_notification ON public.reel_comments;
CREATE TRIGGER trg_reel_comment_notification AFTER INSERT ON public.reel_comments FOR EACH ROW EXECUTE FUNCTION public.create_reel_comment_notification();
CREATE TRIGGER trg_reel_share_notification AFTER INSERT ON public.reel_shares FOR EACH ROW EXECUTE FUNCTION public.create_reel_share_notification();
DROP TRIGGER IF EXISTS trg_follow_notification ON public.follows;
CREATE TRIGGER trg_follow_notification AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.create_follow_notification();

ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_shares;