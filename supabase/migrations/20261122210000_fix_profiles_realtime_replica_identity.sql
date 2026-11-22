-- The profiles table is published to Supabase Realtime. PostgreSQL refuses
-- UPDATEs on published tables without a replica identity; use the unique,
-- non-null profile ID index as the identity instead of copying every column.
ALTER TABLE public.profiles
  REPLICA IDENTITY USING INDEX profiles_id_unique_idx;

