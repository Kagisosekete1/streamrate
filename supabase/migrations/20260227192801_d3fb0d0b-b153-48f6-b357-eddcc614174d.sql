
-- Drop the reel view notification trigger to stop reel view alerts
DROP TRIGGER IF EXISTS on_reel_view_notify ON public.reel_views;

-- Drop the function too since it's no longer needed
DROP FUNCTION IF EXISTS public.notify_on_reel_view();

-- Add images column to store_products if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'store_products' AND column_name = 'images'
  ) THEN
    ALTER TABLE public.store_products ADD COLUMN images TEXT[] DEFAULT '{}';
  END IF;
END $$;
