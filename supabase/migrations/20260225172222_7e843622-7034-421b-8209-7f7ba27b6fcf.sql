
-- Drop the reel view notification trigger (correct name) and function with CASCADE
DROP TRIGGER IF EXISTS on_reel_view ON public.reel_views;
DROP FUNCTION IF EXISTS public.notify_on_reel_view() CASCADE;
