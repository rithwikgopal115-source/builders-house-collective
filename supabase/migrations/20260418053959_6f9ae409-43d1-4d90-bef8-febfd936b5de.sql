-- =========================================================
-- FIX 1: Helper functions + rewrite all profiles policies
-- =========================================================

create or replace function public.is_approved_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_approved from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---- profiles ----
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Approved members can view all profiles" on public.profiles;
drop policy if exists "Approved members can view profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admin can view all profiles" on public.profiles;
drop policy if exists "Admin can update all profiles" on public.profiles;
drop policy if exists "Admin can update any profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Own profile read" on public.profiles
  for select using (auth.uid() = id);

create policy "Own profile insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Own profile update" on public.profiles
  for update using (auth.uid() = id);

create policy "Approved members read profiles" on public.profiles
  for select using (public.is_approved_member());

create policy "Admin full access profiles" on public.profiles
  for all using (public.is_admin_user()) with check (public.is_admin_user());

-- ---- posts ----
drop policy if exists "Admin can delete any post" on public.posts;
drop policy if exists "Admin can post any visibility" on public.posts;
drop policy if exists "Admin can update any post" on public.posts;
drop policy if exists "Approved members can post community or public" on public.posts;
drop policy if exists "Community posts readable by approved members" on public.posts;
drop policy if exists "Private posts readable by admin only" on public.posts;
drop policy if exists "Public posts readable by all" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;

create policy "Admin can delete any post" on public.posts
  for delete using (public.is_admin_user());

create policy "Admin can post any visibility" on public.posts
  for insert with check (public.is_admin_user());

create policy "Admin can update any post" on public.posts
  for update using (public.is_admin_user());

create policy "Approved members can post community or public" on public.posts
  for insert with check (public.is_approved_member() and visibility = any (array['community','public']));

create policy "Community posts readable by approved members" on public.posts
  for select using (visibility = 'community' and public.is_approved_member());

create policy "Private posts readable by admin only" on public.posts
  for select using (visibility = 'private' and public.is_admin_user());

create policy "Public posts readable by all" on public.posts
  for select using (visibility = 'public');

create policy "Users can delete own posts" on public.posts
  for delete using (auth.uid() = user_id);

create policy "Users can update own posts" on public.posts
  for update using (auth.uid() = user_id);

-- ---- comments ----
drop policy if exists "Approved members can comment" on public.comments;
drop policy if exists "Comments on community posts readable by approved members" on public.comments;
drop policy if exists "Comments on public posts readable by all" on public.comments;
drop policy if exists "Users can delete own comments" on public.comments;

create policy "Approved members can comment" on public.comments
  for insert with check (public.is_approved_member());

create policy "Comments on community posts readable by approved members" on public.comments
  for select using (public.is_approved_member());

create policy "Comments on public posts readable by all" on public.comments
  for select using (post_id in (select id from public.posts where visibility = 'public'));

create policy "Users can delete own comments" on public.comments
  for delete using (auth.uid() = user_id);

-- ---- reactions ----
drop policy if exists "Approved members can react" on public.reactions;
drop policy if exists "Public post reactions readable by all" on public.reactions;
drop policy if exists "Reactions readable by approved members" on public.reactions;
drop policy if exists "Users can delete own reactions" on public.reactions;

create policy "Approved members can react" on public.reactions
  for insert with check (public.is_approved_member());

create policy "Reactions readable by approved members" on public.reactions
  for select using (public.is_approved_member());

create policy "Public post reactions readable by all" on public.reactions
  for select using (post_id in (select id from public.posts where visibility = 'public'));

create policy "Users can delete own reactions" on public.reactions
  for delete using (auth.uid() = user_id);

-- ---- tasks ----
drop policy if exists "Approved members can create tasks" on public.tasks;
drop policy if exists "Community tasks readable by approved members" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;

create policy "Approved members can create tasks" on public.tasks
  for insert with check (public.is_approved_member());

create policy "Community tasks readable by approved members" on public.tasks
  for select using (public.is_approved_member());

create policy "Users can delete own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

create policy "Users can update own tasks" on public.tasks
  for update using (auth.uid() = user_id);

-- ---- projects ----
drop policy if exists "Approved members can create projects" on public.projects;
drop policy if exists "Community projects readable by approved members" on public.projects;
drop policy if exists "Public projects readable by all" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;

create policy "Approved members can create projects" on public.projects
  for insert with check (public.is_approved_member());

create policy "Community projects readable by approved members" on public.projects
  for select using (visibility = 'community' and public.is_approved_member());

create policy "Public projects readable by all" on public.projects
  for select using (visibility = 'public');

create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = user_id);

-- ---- project_updates ----
drop policy if exists "Approved members can post project updates" on public.project_updates;
drop policy if exists "Community project updates readable by approved members" on public.project_updates;
drop policy if exists "Public project updates readable by all" on public.project_updates;

create policy "Approved members can post project updates" on public.project_updates
  for insert with check (public.is_approved_member());

create policy "Community project updates readable by approved members" on public.project_updates
  for select using (visibility = 'community' and public.is_approved_member());

create policy "Public project updates readable by all" on public.project_updates
  for select using (visibility = 'public');

-- ---- access_requests ----
drop policy if exists "Admin can manage access requests" on public.access_requests;
drop policy if exists "Anyone can submit access request" on public.access_requests;

create policy "Admin can manage access requests" on public.access_requests
  for all using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Anyone can submit access request" on public.access_requests
  for insert with check (true);

-- ---- admin_settings ----
drop policy if exists "Admin can update settings" on public.admin_settings;
drop policy if exists "Anyone can read settings" on public.admin_settings;

create policy "Admin can update settings" on public.admin_settings
  for update using (public.is_admin_user());

create policy "Anyone can read settings" on public.admin_settings
  for select using (true);

-- ---- onboarding_messages ----
drop policy if exists "Admin can read all onboarding messages" on public.onboarding_messages;
drop policy if exists "Admin can send onboarding messages" on public.onboarding_messages;
drop policy if exists "Requester can read own onboarding messages" on public.onboarding_messages;
drop policy if exists "Requester can send onboarding messages" on public.onboarding_messages;

create policy "Admin can read all onboarding messages" on public.onboarding_messages
  for select using (public.is_admin_user());

create policy "Admin can send onboarding messages" on public.onboarding_messages
  for insert with check (public.is_admin_user());

create policy "Requester can read own onboarding messages" on public.onboarding_messages
  for select using (
    request_id in (
      select id from public.access_requests
      where email = (select email from auth.users where id = auth.uid())::text
    )
  );

create policy "Requester can send onboarding messages" on public.onboarding_messages
  for insert with check (
    request_id in (
      select id from public.access_requests
      where email = (select email from auth.users where id = auth.uid())::text
    )
  );

-- ---- public_visibility_requests ----
drop policy if exists "Admin and post author can see requests" on public.public_visibility_requests;
drop policy if exists "Admin can update requests" on public.public_visibility_requests;
drop policy if exists "Approved members and admin can create requests" on public.public_visibility_requests;
drop policy if exists "Post author can update requests directed at them" on public.public_visibility_requests;

create policy "Admin and post author can see requests" on public.public_visibility_requests
  for select using (
    public.is_admin_user()
    or auth.uid() = initiator_id
    or auth.uid() in (select user_id from public.posts where id = post_id)
  );

create policy "Admin can update requests" on public.public_visibility_requests
  for update using (public.is_admin_user());

create policy "Approved members and admin can create requests" on public.public_visibility_requests
  for insert with check (public.is_approved_member());

create policy "Post author can update requests directed at them" on public.public_visibility_requests
  for update using (auth.uid() in (select user_id from public.posts where id = post_id));