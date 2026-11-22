CREATE OR REPLACE FUNCTION public.notify_on_party_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  party_host_id text;
  party_title text;
  joiner_name text;
BEGIN
  SELECT host_id, title INTO party_host_id, party_title
  FROM public.watch_parties
  WHERE id::text = NEW.party_id::text;

  IF party_host_id IS NULL OR party_host_id = NEW.user_id::text THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'Someone') INTO joiner_name
  FROM public.profiles
  WHERE id::text = NEW.user_id::text;

  INSERT INTO public.notifications (user_id, from_user_id, title, message, type)
  VALUES (
    party_host_id::uuid,
    NEW.user_id::uuid,
    'New Party Member',
    COALESCE(joiner_name, 'Someone') || ' joined your watch party ' || quote_literal(party_title),
    'party_join'
  );

  RETURN NEW;
END;
$$;
