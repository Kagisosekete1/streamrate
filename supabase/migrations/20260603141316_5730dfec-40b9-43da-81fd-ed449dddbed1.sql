
CREATE TABLE IF NOT EXISTS public.stream_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  platform text NOT NULL DEFAULT 'custom',
  stream_url text,
  scheduled_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stream_schedules_scheduled_at_idx ON public.stream_schedules (scheduled_at);
CREATE INDEX IF NOT EXISTS stream_schedules_user_id_idx ON public.stream_schedules (user_id);

GRANT SELECT ON public.stream_schedules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stream_schedules TO authenticated;
GRANT ALL ON public.stream_schedules TO service_role;

ALTER TABLE public.stream_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stream schedules are viewable by everyone"
  ON public.stream_schedules FOR SELECT USING (true);

CREATE POLICY "Users can create their own stream schedules"
  ON public.stream_schedules FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stream schedules"
  ON public.stream_schedules FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stream schedules"
  ON public.stream_schedules FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.stream_schedule_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.stream_schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, user_id)
);

CREATE INDEX IF NOT EXISTS stream_schedule_reminders_user_id_idx ON public.stream_schedule_reminders (user_id);
CREATE INDEX IF NOT EXISTS stream_schedule_reminders_schedule_id_idx ON public.stream_schedule_reminders (schedule_id);

GRANT SELECT, INSERT, DELETE ON public.stream_schedule_reminders TO authenticated;
GRANT ALL ON public.stream_schedule_reminders TO service_role;

ALTER TABLE public.stream_schedule_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
  ON public.stream_schedule_reminders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Schedule owners can view reminders for their schedules"
  ON public.stream_schedule_reminders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stream_schedules s
      WHERE s.id = stream_schedule_reminders.schedule_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own reminders"
  ON public.stream_schedule_reminders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.stream_schedule_reminders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_stream_schedules_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stream_schedules_updated_at ON public.stream_schedules;
CREATE TRIGGER trg_stream_schedules_updated_at
  BEFORE UPDATE ON public.stream_schedules
  FOR EACH ROW EXECUTE FUNCTION public.touch_stream_schedules_updated_at();
