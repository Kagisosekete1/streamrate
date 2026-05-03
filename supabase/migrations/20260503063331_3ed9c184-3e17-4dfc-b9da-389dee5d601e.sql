
-- ============================================================
-- PART 1: CRITICAL SECURITY HARDENING
-- ============================================================
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can self-assign role only on signup"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('fan'::app_role, 'streamer'::app_role, 'seller'::app_role)
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can view verifications" ON public.seller_verifications;
CREATE POLICY "Users can view their own verification"
ON public.seller_verifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_verified_seller(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seller_verifications
    WHERE user_id = _user_id AND is_verified = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

DROP POLICY IF EXISTS "Anyone can view reel view counts" ON public.reel_views;
CREATE POLICY "Users can view their own reel view records"
ON public.reel_views FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view active boosts" ON public.profile_boosts;
CREATE POLICY "Users can view their own boosts"
ON public.profile_boosts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert analytics" ON public.streaming_analytics;
CREATE POLICY "Users can insert their own analytics"
ON public.streaming_analytics FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can update hashtag counts" ON public.hashtags;
DROP POLICY IF EXISTS "Anyone can create hashtags" ON public.hashtags;
CREATE POLICY "Authenticated users can create hashtags"
ON public.hashtags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can manage hashtag daily usage" ON public.hashtag_daily_usage;
DROP POLICY IF EXISTS "System can update hashtag daily usage" ON public.hashtag_daily_usage;
CREATE POLICY "Authenticated users can record hashtag daily usage"
ON public.hashtag_daily_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.increment_hashtag_use_count(_hashtag_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.hashtags SET use_count = use_count + 1 WHERE id = _hashtag_id;
$$;

REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- ============================================================
-- PART 2: REFERRAL SYSTEM + MANUAL VERIFICATION BADGE
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manual_verification_badge text,
  ADD COLUMN IF NOT EXISTS manual_verification_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_verification_reason text,
  ADD COLUMN IF NOT EXISTS referral_code text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_manual_verification_badge_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_manual_verification_badge_check
      CHECK (manual_verification_badge IN ('red','blue','gold') OR manual_verification_badge IS NULL);
  END IF;
END $$;

UPDATE public.profiles
SET referral_code = lower(substring(replace(id::text, '-', ''), 1, 10))
WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uidx ON public.profiles(referral_code);

CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := lower(substring(replace(NEW.id::text, '-', ''), 1, 10));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_referral_code ON public.profiles;
CREATE TRIGGER profiles_set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referee_id uuid NOT NULL UNIQUE,
  referral_code text NOT NULL,
  reward_granted boolean NOT NULL DEFAULT false,
  reward_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see referrals they made or received" ON public.referrals;
CREATE POLICY "Users can see referrals they made or received"
ON public.referrals FOR SELECT TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id);

CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referrer_id uuid;
  v_referee_id uuid := auth.uid();
  v_recent_count int;
  v_expires timestamptz;
BEGIN
  IF v_referee_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT id INTO v_referrer_id FROM public.profiles
   WHERE lower(referral_code) = lower(trim(_code));

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_not_found');
  END IF;
  IF v_referrer_id = v_referee_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  SELECT count(*) INTO v_recent_count FROM public.referrals
   WHERE referrer_id = v_referrer_id AND reward_granted = true
     AND created_at > now() - interval '1 year';

  IF v_recent_count >= 1 THEN
    INSERT INTO public.referrals (referrer_id, referee_id, referral_code, reward_granted)
    VALUES (v_referrer_id, v_referee_id, _code, false)
    ON CONFLICT (referee_id) DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'reward_granted', false, 'reason', 'referrer_already_rewarded');
  END IF;

  v_expires := now() + interval '1 year';

  INSERT INTO public.referrals (referrer_id, referee_id, referral_code, reward_granted, reward_expires_at)
  VALUES (v_referrer_id, v_referee_id, _code, true, v_expires)
  ON CONFLICT (referee_id) DO NOTHING
  RETURNING reward_expires_at INTO v_expires;

  IF v_expires IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;

  UPDATE public.profiles
  SET manual_verification_badge = 'blue',
      manual_verification_expires_at = GREATEST(COALESCE(manual_verification_expires_at, now()), v_expires),
      manual_verification_reason = 'referral_reward'
  WHERE id = v_referrer_id;

  RETURN jsonb_build_object('ok', true, 'reward_granted', true, 'expires_at', v_expires);
END;
$$;

-- ============================================================
-- PART 3: SECURITY FINDINGS PAGE (admin-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_id text NOT NULL UNIQUE,
  scanner text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','fixed','ignored','in_progress')),
  fixed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all findings" ON public.security_findings;
CREATE POLICY "Admins can view all findings"
ON public.security_findings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update findings" ON public.security_findings;
CREATE POLICY "Admins can update findings"
ON public.security_findings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert findings" ON public.security_findings;
CREATE POLICY "Admins can insert findings"
ON public.security_findings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS security_findings_updated ON public.security_findings;
CREATE TRIGGER security_findings_updated
BEFORE UPDATE ON public.security_findings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
