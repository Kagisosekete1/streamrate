BEGIN;

-- Reel rows imported without identifiers cannot be targeted by likes,
-- comments, views, or shares. Preserve every row and assign IDs only where
-- the legacy import left them NULL.
ALTER TABLE public.reels
  ALTER COLUMN id SET DEFAULT (gen_random_uuid()::text);

UPDATE public.reels
SET id = gen_random_uuid()::text
WHERE id IS NULL;

ALTER TABLE public.reels
  ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reels'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.reels ADD CONSTRAINT reels_pkey PRIMARY KEY (id);
  END IF;
END;
$$;

-- Several imported reels have no timestamp. Recover it from the matching
-- Storage object when available; use the current timestamp only when Storage
-- has no matching object, avoiding the epoch/"57 years ago" display.
WITH reel_objects AS (
  SELECT r.id,
         split_part(split_part(r.video_url, '/storage/v1/object/public/', 2), '?', 1) AS object_path
  FROM public.reels r
  WHERE r.created_at IS NULL
), parsed_objects AS (
  SELECT id,
         split_part(object_path, '/', 1) AS bucket_id,
         substring(object_path FROM length(split_part(object_path, '/', 1)) + 2) AS object_name
  FROM reel_objects
  WHERE object_path <> ''
), storage_dates AS (
  SELECT p.id, min(o.created_at) AS created_at
  FROM parsed_objects p
  JOIN storage.objects o ON o.bucket_id = p.bucket_id AND o.name = p.object_name
  GROUP BY p.id
)
UPDATE public.reels r
SET created_at = COALESCE(s.created_at, now())
FROM (SELECT r2.id, s.created_at FROM public.reels r2
      LEFT JOIN storage_dates s ON s.id = r2.id
      WHERE r2.created_at IS NULL) AS s
WHERE r.id = s.id;

ALTER TABLE public.reels
  ALTER COLUMN created_at SET DEFAULT now();
UPDATE public.reels SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.reels ALTER COLUMN created_at SET NOT NULL;

-- New posts also omit created_at in the client and rely on the database
-- default. Restore that default and repair any rows that were imported NULL.
ALTER TABLE public.posts
  ALTER COLUMN created_at SET DEFAULT now();
UPDATE public.posts SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.posts ALTER COLUMN created_at SET NOT NULL;

-- Legacy reel notification triggers declared UUID local variables even though
-- reel/profile/notification identifiers are text. The exception handler hid
-- the type error and silently skipped every reel alert.
CREATE OR REPLACE FUNCTION public.notify_on_reel_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  owner_id text;
  actor_name text;
BEGIN
  SELECT r.user_id::text INTO owner_id
  FROM public.reels AS r
  WHERE r.id::text = NEW.reel_id::text;

  IF owner_id IS NULL OR owner_id = NEW.user_id::text THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.username, p.full_name, 'Someone') INTO actor_name
  FROM public.profiles AS p
  WHERE p.id::text = NEW.user_id::text;

  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, reel_id)
  VALUES (owner_id, NEW.user_id::text, 'New Like',
    COALESCE(actor_name, 'Someone') || ' liked your reel', 'reel_like', NEW.reel_id::text);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_reel_like failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reel_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  owner_id text;
  actor_name text;
BEGIN
  SELECT r.user_id::text INTO owner_id
  FROM public.reels AS r
  WHERE r.id::text = NEW.reel_id::text;

  IF owner_id IS NULL OR owner_id = NEW.user_id::text THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.username, p.full_name, 'Someone') INTO actor_name
  FROM public.profiles AS p
  WHERE p.id::text = NEW.user_id::text;

  INSERT INTO public.notifications (user_id, from_user_id, title, message, type, reel_id, comment_id)
  VALUES (owner_id, NEW.user_id::text, 'New Reel Comment',
    COALESCE(actor_name, 'Someone') || ' commented on your reel: ' || LEFT(NEW.content, 100),
    'reel_comment', NEW.reel_id::text, NEW.id::text);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_reel_comment failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Remove the stale duplicate dispatcher that still called the former
-- eqgouykzakjdmgmbnsca project. The secured current-project notify_push
-- trigger above it is the only dispatch path this app should use.
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notifications;

COMMIT;
