BEGIN;

-- Remove the previous count triggers. Their UUID = text comparisons can still
-- roll back likes/comments even though the newer safe counter trigger exists.
DROP TRIGGER IF EXISTS post_likes_count_after_insert ON public.post_likes;
DROP TRIGGER IF EXISTS post_likes_count_after_delete ON public.post_likes;
DROP TRIGGER IF EXISTS comments_count_after_insert ON public.comments;
DROP TRIGGER IF EXISTS comments_count_after_delete ON public.comments;

-- Keep reads available so comments inserted from mobile immediately appear
-- for their author and other viewers. Writes remain scoped to the signed-in user.
GRANT SELECT ON public.comments, public.reel_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments, public.reel_comments TO authenticated;
GRANT ALL ON public.comments, public.reel_comments TO service_role;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Zyiro users can read comments" ON public.comments;
CREATE POLICY "Zyiro users can read comments"
  ON public.comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Zyiro users can add own comments" ON public.comments;
CREATE POLICY "Zyiro users can add own comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Zyiro users can edit own comments" ON public.comments;
CREATE POLICY "Zyiro users can edit own comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Zyiro users can delete own comments" ON public.comments;
CREATE POLICY "Zyiro users can delete own comments"
  ON public.comments FOR DELETE TO authenticated
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Zyiro users can read reel comments" ON public.reel_comments;
CREATE POLICY "Zyiro users can read reel comments"
  ON public.reel_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Zyiro users can add own reel comments" ON public.reel_comments;
CREATE POLICY "Zyiro users can add own reel comments"
  ON public.reel_comments FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Zyiro users can edit own reel comments" ON public.reel_comments;
CREATE POLICY "Zyiro users can edit own reel comments"
  ON public.reel_comments FOR UPDATE TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Zyiro users can delete own reel comments" ON public.reel_comments;
CREATE POLICY "Zyiro users can delete own reel comments"
  ON public.reel_comments FOR DELETE TO authenticated
  USING (user_id::text = auth.uid()::text);

ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.reel_comments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reel_comments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;
    END IF;
  END IF;
END $$;

COMMIT;
