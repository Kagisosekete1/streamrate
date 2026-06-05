
-- Notification preferences per user
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification settings"
  ON public.notification_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin-visible dispatch logs
CREATE TABLE IF NOT EXISTS public.reminder_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ok',
  scanned INT NOT NULL DEFAULT 0,
  sent INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reminder_dispatch_logs TO authenticated;
GRANT ALL ON public.reminder_dispatch_logs TO service_role;

ALTER TABLE public.reminder_dispatch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seen-admin can read dispatch logs"
  ON public.reminder_dispatch_logs FOR SELECT
  USING (public.is_seen_admin());

CREATE INDEX IF NOT EXISTS idx_reminder_dispatch_logs_run_at
  ON public.reminder_dispatch_logs (run_at DESC);

-- Retry tracking on existing reminders
ALTER TABLE public.stream_schedule_reminders
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT;
