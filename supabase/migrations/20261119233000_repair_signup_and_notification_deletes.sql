-- Repair auth profile creation after QR handles became required.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qr_handle text;

UPDATE public.profiles
SET qr_handle = 'user' || substring(replace(id::text, '-', ''), 1, 26)
WHERE qr_handle IS NULL OR btrim(qr_handle) = '';

WITH duplicate_handles AS (
  SELECT id,
         row_number() OVER (PARTITION BY qr_handle ORDER BY created_at NULLS LAST, id) AS row_num
  FROM public.profiles
)
UPDATE public.profiles AS p
SET qr_handle = 'user' || substring(replace(p.id::text, '-', ''), 1, 26)
FROM duplicate_handles AS d
WHERE p.id = d.id AND d.row_num > 1;

ALTER TABLE public.profiles
  ALTER COLUMN qr_handle SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_qr_handle_unique_idx
  ON public.profiles (qr_handle);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, qr_handle)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    'user' || substring(replace(NEW.id::text, '-', ''), 1, 26)
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        qr_handle = COALESCE(public.profiles.qr_handle, EXCLUDED.qr_handle);

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()';
  END IF;
END;
$$;

-- Post deletion cascades into notifications. FULL identity lets Realtime
-- publish those DELETE events even in databases where notifications has no PK.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id::text);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
