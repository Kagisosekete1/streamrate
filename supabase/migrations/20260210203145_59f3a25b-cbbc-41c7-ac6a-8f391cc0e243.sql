
-- Add 'seller' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';

-- Add is_private column to posts (default false = public)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Update RLS: public posts visible to everyone, private posts only to owner
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Anyone can view public posts" ON public.posts
  FOR SELECT USING (is_private = false OR auth.uid() = user_id);
