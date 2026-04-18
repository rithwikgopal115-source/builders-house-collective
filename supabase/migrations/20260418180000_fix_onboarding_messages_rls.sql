-- Fix: onboarding_messages requester policies used auth.users directly,
-- which is not accessible from RLS expressions. Replace with auth.email().

drop policy if exists "Requester can read own onboarding messages" on public.onboarding_messages;
drop policy if exists "Requester can send onboarding messages" on public.onboarding_messages;

create policy "Requester can read own onboarding messages"
  on public.onboarding_messages for select
  using (
    request_id in (
      select id from public.access_requests
      where email = auth.email()
    )
  );

create policy "Requester can send onboarding messages"
  on public.onboarding_messages for insert
  with check (
    request_id in (
      select id from public.access_requests
      where email = auth.email()
    )
  );
