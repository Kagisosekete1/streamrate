BEGIN;

-- Repair missing/epoch timestamps so new and legacy feed items get a usable age.
ALTER TABLE public.posts
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.posts
SET created_at = CASE
  WHEN updated_at IS NOT NULL AND updated_at > TIMESTAMPTZ '1970-01-02 00:00:00+00'
    THEN updated_at
  ELSE now()
END
WHERE created_at IS NULL
   OR created_at <= TIMESTAMPTZ '1970-01-02 00:00:00+00';

ALTER TABLE public.posts
  ALTER COLUMN created_at SET NOT NULL;

-- Ensure post likes and comment/reply changes publish complete rows, including
-- old values on deletes, so all connected clients can reconcile realtime state.
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.comment_likes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_likes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comment_likes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
    END IF;
  END IF;
END $$;

COMMIT;
