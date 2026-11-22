BEGIN;

-- Restore usable IDs for posts created while the ID default/constraint was
-- missing. Rows without an ID cannot be liked or commented on by the app.
ALTER TABLE public.posts
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE public.posts
SET id = gen_random_uuid()
WHERE id IS NULL;

-- Keep post IDs unique and non-null on projects where a previous migration
-- removed the primary key. The existing live rows were checked for duplicate
-- IDs before this migration was prepared.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.posts'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_pkey PRIMARY KEY (id);
  END IF;
END;
$$;

-- Older social migrations also left NULL IDs in interaction rows. Those rows
-- remain in place; assign IDs so they can be replied to, liked, edited, and
-- deleted normally. Restore defaults for all new interactions.
DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY[
    'post_likes',
    'comments',
    'comment_likes',
    'reel_likes',
    'reel_comments'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()', table_name);
    EXECUTE format('UPDATE public.%I SET id = gen_random_uuid() WHERE id IS NULL', table_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET NOT NULL', table_name);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = format('public.%I', table_name)::regclass
        AND contype = 'p'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (id)',
        table_name,
        table_name || '_pkey'
      );
    END IF;
  END LOOP;
END;
$$;

-- Preserve idempotent one-like-per-user behavior on rows with real targets.
-- Historical orphan rows with NULL targets are preserved without blocking the
-- unique indexes for new, valid interactions.
CREATE UNIQUE INDEX IF NOT EXISTS post_likes_post_user_uidx
  ON public.post_likes (post_id, user_id)
  WHERE post_id IS NOT NULL AND user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS comment_likes_comment_user_uidx
  ON public.comment_likes (comment_id, user_id)
  WHERE comment_id IS NOT NULL AND user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reel_likes_reel_user_uidx
  ON public.reel_likes (reel_id, user_id)
  WHERE reel_id IS NOT NULL AND user_id IS NOT NULL;

-- Ensure every table watched by the app emits realtime events in Supabase.
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.comment_likes REPLICA IDENTITY FULL;
ALTER TABLE public.reel_likes REPLICA IDENTITY FULL;
ALTER TABLE public.reel_comments REPLICA IDENTITY FULL;

DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY[
    'post_likes',
    'comments',
    'comment_likes',
    'reel_likes',
    'reel_comments'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY table_names LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
