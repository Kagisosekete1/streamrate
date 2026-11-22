-- Smart-feed view tracking upserts on (user_id, post_id). Restore the
-- missing unique index so PostgREST ON CONFLICT works on production data.
-- Existing rows were checked for duplicate viewer/post pairs before this index
-- was created; no view history is removed or rewritten.
CREATE UNIQUE INDEX IF NOT EXISTS post_views_user_post_uidx
  ON public.post_views (user_id, post_id);
