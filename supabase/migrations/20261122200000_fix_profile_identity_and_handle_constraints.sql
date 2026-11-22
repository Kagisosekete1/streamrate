-- Signup's auth trigger uses ON CONFLICT (id), so profiles.id must be unique.
-- Existing production data was checked before applying this migration: all 82
-- rows have distinct, non-null IDs and QR handles matching the app's validator.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles GROUP BY id HAVING id IS NULL OR count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add profile identity uniqueness: duplicate or null profile IDs exist';
  END IF;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_id_unique_idx
  ON public.profiles (id);

-- Keep the database QR handle validator aligned with src/lib/profileQr.ts.
-- The old database rule rejected underscores even though the app sanitizer
-- explicitly allows them, causing otherwise valid profile saves to fail.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_qr_handle_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_qr_handle_format
  CHECK (qr_handle ~ '^[a-z][a-z0-9_]{2,29}$');

