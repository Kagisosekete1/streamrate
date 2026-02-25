
-- Add deactivation/deletion columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_deactivated boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone DEFAULT NULL;
