-- Enable RLS on realtime.messages and add a topic-based policy
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime messages" ON realtime.messages;

-- Allow authenticated users to read messages on channels they're allowed on.
-- Private user-scoped topics must contain the user's id (e.g. "notif-<uuid>" or "user:<uuid>:...").
CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Public/global topics not containing a uuid pattern
  (realtime.topic() !~ '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
  OR
  -- Private topics: must include the current user's uuid
  (realtime.topic() ILIKE '%' || auth.uid()::text || '%')
);

CREATE POLICY "Authenticated can write realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() !~ '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
  OR
  (realtime.topic() ILIKE '%' || auth.uid()::text || '%')
);