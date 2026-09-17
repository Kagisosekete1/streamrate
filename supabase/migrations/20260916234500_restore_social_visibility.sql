-- StreamRate: restore public visibility for existing social data and media.
-- Safe to run repeatedly. It does not delete, overwrite, or import rows/files.
BEGIN;

-- Restore Data API read access for the public social/feed tables that exist.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'posts', 'reels', 'comments', 'replies',
    'post_likes', 'comment_likes', 'reel_likes', 'reel_comments',
    'post_shares', 'reel_shares', 'follows', 'ratings',
    'hashtags', 'reel_hashtags'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Public read restored" ON public.%I', table_name);
      EXECUTE format('CREATE POLICY "Public read restored" ON public.%I FOR SELECT TO anon, authenticated USING (true)', table_name);
    END IF;
  END LOOP;
END
$$;

-- Preserve profile email privacy while restoring the public profile directory.
-- The app should request explicit public profile columns, not profiles.email.
DO $$
DECLARE
  public_columns text;
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
      INTO public_columns
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'profiles'
       AND column_name <> 'email';

    IF public_columns IS NOT NULL THEN
      REVOKE SELECT ON public.profiles FROM anon, authenticated;
      EXECUTE format('GRANT SELECT (%s) ON public.profiles TO anon, authenticated', public_columns);
    END IF;
  END IF;
END
$$;

-- Make existing legacy media reachable through the public Storage URL API.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('post-images', 'post-images', true),
  ('reels', 'reels', true),
  ('product-images', 'product-images', true),
  ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public media read restored" ON storage.objects;
CREATE POLICY "Public media read restored"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('avatars', 'post-images', 'reels', 'product-images', 'email-assets'));

COMMIT;

-- Verification: run after the migration.
SELECT
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.posts) AS posts,
  (SELECT count(*) FROM public.reels) AS reels,
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'avatars') AS avatar_files,
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'post-images') AS post_image_files,
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'reels') AS reel_files;
