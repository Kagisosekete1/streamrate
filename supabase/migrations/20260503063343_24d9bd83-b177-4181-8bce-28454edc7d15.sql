
REVOKE EXECUTE ON FUNCTION public.redeem_referral(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_hashtag_use_count(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.increment_hashtag_use_count(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_verified_seller(uuid) FROM anon;
