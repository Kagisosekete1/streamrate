
CREATE OR REPLACE FUNCTION public.notify_on_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referee_name TEXT;
BEGIN
  SELECT COALESCE(username, full_name, 'Someone') INTO referee_name
  FROM public.profiles WHERE id = NEW.referee_id;

  INSERT INTO public.notifications (user_id, from_user_id, title, message, type)
  VALUES (
    NEW.referrer_id,
    NEW.referee_id,
    CASE WHEN NEW.reward_granted THEN 'Blue Verification earned!' ELSE 'New Referral' END,
    CASE
      WHEN NEW.reward_granted THEN COALESCE(referee_name,'Someone') || ' joined using your link — Blue badge unlocked for 1 year.'
      ELSE COALESCE(referee_name,'Someone') || ' joined using your link.'
    END,
    'referral'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_referral ON public.referrals;
CREATE TRIGGER trg_notify_on_referral
AFTER INSERT ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.notify_on_referral();
