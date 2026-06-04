
ALTER TABLE public.stream_schedule_reminders
  ADD COLUMN IF NOT EXISTS lead_minutes integer NOT NULL DEFAULT 15;

ALTER TABLE public.stream_schedules
  ADD COLUMN IF NOT EXISTS timezone text;
