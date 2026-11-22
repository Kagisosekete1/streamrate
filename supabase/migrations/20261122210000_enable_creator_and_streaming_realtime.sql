-- Make creator dashboard, creator suggestions, leaderboard, and streaming
-- analytics receive the same persisted row changes shown in Supabase.
-- This is additive and intentionally leaves existing data and RLS untouched.
DO $$
DECLARE
  relation_name text;
  publication_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) INTO publication_exists;

  IF NOT publication_exists THEN
    RETURN;
  END IF;

  FOREACH relation_name IN ARRAY ARRAY[
    'profiles',
    'user_roles',
    'follows',
    'ratings',
    'posts',
    'post_likes',
    'comments',
    'reels',
    'reel_views',
    'streaming_analytics',
    'connected_platforms'
  ] LOOP
    IF to_regclass(format('public.%I', relation_name)) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = relation_name
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', relation_name);
    END IF;
  END LOOP;
END;
$$;
