
-- 1. Add new daily missions for the new features
INSERT INTO public.daily_missions (title, description, action_type, target_count, xp_reward, coin_reward, icon, is_active)
VALUES
  ('Party Host', 'Host a watch party', 'host_party', 1, 30, 15, '🎉', true),
  ('Squad Leader', 'Post an LFG squad request', 'post_lfg', 1, 20, 10, '🎮', true),
  ('Poll Voter', 'Vote in a stream poll', 'vote_poll', 1, 15, 5, '🗳️', true),
  ('Clip Master', 'Clip a live stream moment', 'clip_stream', 1, 25, 10, '✂️', true);

-- 2. Trigger: notify host when someone joins their watch party
CREATE OR REPLACE FUNCTION public.notify_on_party_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host UUID;
  party_title TEXT;
  joiner_name TEXT;
BEGIN
  SELECT host_id, title INTO host, party_title FROM public.watch_parties WHERE id = NEW.party_id;
  IF host IS NULL OR host = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Someone') INTO joiner_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type)
  VALUES (host, NEW.user_id, 'New Party Member', joiner_name || ' joined your watch party "' || party_title || '"', 'party_join');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_party_join ON public.watch_party_members;
CREATE TRIGGER trg_notify_on_party_join
AFTER INSERT ON public.watch_party_members
FOR EACH ROW EXECUTE FUNCTION public.notify_on_party_join();

-- 3. Trigger: notify streamer when someone votes in their poll
CREATE OR REPLACE FUNCTION public.notify_on_poll_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streamer UUID;
  poll_q TEXT;
  voter_name TEXT;
BEGIN
  SELECT streamer_id, question INTO streamer, poll_q FROM public.stream_polls WHERE id = NEW.poll_id;
  IF streamer IS NULL OR streamer = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Someone') INTO voter_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, from_user_id, title, message, type)
  VALUES (streamer, NEW.user_id, 'New Poll Vote', voter_name || ' voted on "' || LEFT(poll_q, 40) || '"', 'poll_vote');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_poll_vote ON public.poll_votes;
CREATE TRIGGER trg_notify_on_poll_vote
AFTER INSERT ON public.poll_votes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_poll_vote();

-- 4. App version table for forced update banner
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  release_notes TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Versions viewable by everyone"
ON public.app_versions FOR SELECT USING (true);

INSERT INTO public.app_versions (version, release_notes, is_required)
VALUES ('1.1.0', 'New features: Watch Parties, Squad Up (LFG), Stream Polls, Clip It!, and new daily missions to earn XP & coins!', false);
