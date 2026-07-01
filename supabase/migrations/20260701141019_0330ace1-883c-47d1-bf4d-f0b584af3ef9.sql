
-- 1) Notification settings: add per-category toggles
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS raids_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS co_stream_requests_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tournament_events_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2) Tournament match confirmation + lock + audit trail
ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.tournament_match_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_winner_team_id UUID,
  new_winner_team_id UUID,
  old_score_a INTEGER,
  new_score_a INTEGER,
  old_score_b INTEGER,
  new_score_b INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournament_match_audit TO anon;
GRANT SELECT, INSERT ON public.tournament_match_audit TO authenticated;
GRANT ALL ON public.tournament_match_audit TO service_role;
ALTER TABLE public.tournament_match_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit publicly viewable" ON public.tournament_match_audit FOR SELECT USING (true);
CREATE POLICY "Hosts insert audit rows" ON public.tournament_match_audit FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = (SELECT host_user_id FROM public.tournaments WHERE id = tournament_id));
CREATE INDEX IF NOT EXISTS tournament_match_audit_match_idx ON public.tournament_match_audit(match_id, created_at DESC);

-- Trigger: prevent changing winner_team_id on a locked match; auto-write basic audit rows
CREATE OR REPLACE FUNCTION public.enforce_locked_tournament_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.locked = true THEN
    IF NEW.winner_team_id IS DISTINCT FROM OLD.winner_team_id
       OR NEW.score_a IS DISTINCT FROM OLD.score_a
       OR NEW.score_b IS DISTINCT FROM OLD.score_b
       OR NEW.locked IS DISTINCT FROM OLD.locked THEN
      RAISE EXCEPTION 'This match result is locked and cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournament_matches_locked ON public.tournament_matches;
CREATE TRIGGER trg_tournament_matches_locked
  BEFORE UPDATE ON public.tournament_matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_locked_tournament_match();

-- 3) Role-based restrictions: only streamers may host tournaments and initiate raids / co-stream requests
DROP POLICY IF EXISTS "Users create tournaments" ON public.tournaments;
CREATE POLICY "Streamers create tournaments" ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_user_id AND public.has_role(auth.uid(), 'streamer'));

DROP POLICY IF EXISTS "Streamers send their own raids" ON public.stream_raids;
CREATE POLICY "Streamers send their own raids" ON public.stream_raids FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id AND public.has_role(auth.uid(), 'streamer'));

DROP POLICY IF EXISTS "Senders create co-stream requests" ON public.co_stream_requests;
CREATE POLICY "Streamers create co-stream requests" ON public.co_stream_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id AND public.has_role(auth.uid(), 'streamer'));
