-- Allow approved candidates to self-signup:
-- When a new auth user is created, check if their email matches an approved
-- access_request. If so, set is_approved=true on the profile automatically.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_approved boolean := false;
BEGIN
  SELECT (status = 'approved') INTO _is_approved
  FROM public.access_requests
  WHERE email = NEW.email
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.profiles (id, display_name, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(_is_approved, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- RPC: lets a newly signed-up user claim approval if their email
-- matches an approved access_request (fallback in case trigger missed it)
CREATE OR REPLACE FUNCTION public.claim_approved_access()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _approved boolean;
BEGIN
  SELECT (status = 'approved') INTO _approved
  FROM public.access_requests
  WHERE email = auth.email()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _approved THEN
    UPDATE public.profiles SET is_approved = true WHERE id = auth.uid();
    RETURN true;
  END IF;
  RETURN false;
END;
$$;
