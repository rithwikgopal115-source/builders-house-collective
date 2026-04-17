-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.member_tier AS ENUM ('learner', 'founder');
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.post_type AS ENUM ('text', 'link', 'video', 'doc');

-- =========================================
-- TIMESTAMP HELPER
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'member',
  bio TEXT,
  what_building TEXT,
  avatar_url TEXT,
  tier public.member_tier NOT NULL DEFAULT 'learner',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER ROLES (separate table, no recursion)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_approved FROM public.profiles WHERE id = _user_id), false);
$$;

-- =========================================
-- ACCESS REQUESTS
-- =========================================
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  what_building TEXT NOT NULL,
  requested_tier public.member_tier NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- =========================================
-- CHANNELS
-- =========================================
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- =========================================
-- POSTS
-- =========================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  post_type public.post_type NOT NULL DEFAULT 'text',
  url TEXT,
  looking_for TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_posts_channel_created ON public.posts(channel_id, created_at DESC);
CREATE INDEX idx_posts_author ON public.posts(author_id);

CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- REACTIONS
-- =========================================
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reactions_post ON public.reactions(post_id);

-- =========================================
-- COMMENTS
-- =========================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_comments_post ON public.comments(post_id, created_at);

-- =========================================
-- PROFILE LINKS
-- =========================================
CREATE TABLE public.profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

-- =========================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- RLS POLICIES
-- =========================================

-- profiles: public read, self-update, admin update
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "admins update any profile" ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert profiles" ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles: only admins manage; users can read their own roles
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- access_requests: anyone can submit; only admins read/manage
CREATE POLICY "anyone submits request" ON public.access_requests FOR INSERT
  WITH CHECK (true);
CREATE POLICY "admins read requests" ON public.access_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update requests" ON public.access_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete requests" ON public.access_requests FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- channels: public read, admin manage
CREATE POLICY "channels readable by all" ON public.channels FOR SELECT USING (true);
CREATE POLICY "admins manage channels" ON public.channels FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- posts: public read, approved members create, owner/admin update/delete
CREATE POLICY "posts readable by all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "approved members create posts" ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.is_approved(auth.uid()));
CREATE POLICY "authors update own posts" ON public.posts FOR UPDATE
  USING (auth.uid() = author_id);
CREATE POLICY "admins update any post" ON public.posts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authors delete own posts" ON public.posts FOR DELETE
  USING (auth.uid() = author_id);
CREATE POLICY "admins delete any post" ON public.posts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- reactions: public read, approved members create, own delete
CREATE POLICY "reactions readable by all" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "approved members react" ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));
CREATE POLICY "users delete own reactions" ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- comments: public read, approved members create, own update/delete, admin delete
CREATE POLICY "comments readable by all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "approved members comment" ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.is_approved(auth.uid()));
CREATE POLICY "authors update own comments" ON public.comments FOR UPDATE
  USING (auth.uid() = author_id);
CREATE POLICY "authors delete own comments" ON public.comments FOR DELETE
  USING (auth.uid() = author_id);
CREATE POLICY "admins delete any comment" ON public.comments FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- profile_links: public read, owner manage
CREATE POLICY "profile links readable by all" ON public.profile_links FOR SELECT USING (true);
CREATE POLICY "users manage own links" ON public.profile_links FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- =========================================
-- STORAGE: avatars bucket
-- =========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars publicly readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own avatar" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================
-- REALTIME
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;

-- =========================================
-- SEED: channels
-- =========================================
INSERT INTO public.channels (slug, name, description, icon, sort_order) VALUES
  ('resources', 'Resources', 'Frameworks, docs, and templates worth saving.', 'BookOpen', 1),
  ('ai-news', 'AI News', 'What just shipped and what it means for builders.', 'Sparkles', 2),
  ('hiring', 'Hiring', 'Roles, gigs, and collaborations.', 'Briefcase', 3),
  ('vibing', 'Vibing', 'Music, mood, and the soundtrack to the work.', 'Music', 4),
  ('ideas', 'Ideas', 'Half-formed thoughts. Pressure-test them here.', 'Lightbulb', 5);

-- =========================================
-- SEED: system author profile (uses fixed UUID)
-- The profile row references auth.users; we insert a synthetic auth user for the system author.
-- =========================================
DO $$
DECLARE
  sys_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- create a synthetic auth user row for the system author (no login possible)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES (sys_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'system@buildershouse.local', crypt(gen_random_uuid()::text, gen_salt('bf')), now(), now(), now(), '{"provider":"system","providers":["system"]}'::jsonb, '{"display_name":"builders house"}'::jsonb, false, '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- ensure profile exists with system flag + founder tier + approved
  INSERT INTO public.profiles (id, display_name, bio, tier, is_approved, is_system)
  VALUES (sys_id, 'builders house', 'official account', 'founder', true, true)
  ON CONFLICT (id) DO UPDATE SET is_system = true, tier = 'founder', is_approved = true, display_name = 'builders house';
END $$;

-- =========================================
-- SEED: placeholder posts under system author
-- =========================================
INSERT INTO public.posts (channel_id, author_id, title, content, post_type)
SELECT c.id, '00000000-0000-0000-0000-000000000001', p.title, p.content, p.post_type::public.post_type
FROM (VALUES
  ('resources', 'IA 3.0 — full architecture doc for AI-powered content systems', 'A complete blueprint for building information architectures around generative systems. Covers retrieval, ranking, and feedback loops.', 'doc'),
  ('resources', 'Automate 90 Webflow — the step-by-step delivery system for web design outreach', 'Ninety days from cold outreach to retainer. The exact workflow, scripts, and automations.', 'doc'),
  ('resources', 'Conditions Deck template — how to map your avatar before writing a word', 'A pre-writing framework for finding the conditions under which your offer becomes obvious.', 'doc'),
  ('ai-news', 'Claude now runs inside Cowork — what that changes for solo builders', 'Embedded models in your IDE means the loop between idea and shipped feature collapses. Here is what to do about it.', 'text'),
  ('ai-news', 'Context engineering is the new prompt engineering', 'Stop optimizing prompts. Start engineering the surrounding context. The reliability gains are absurd.', 'text'),
  ('ideas', 'What if the onboarding process itself was the product demo?', 'Most onboarding is friction. What if every step taught the user something about the product they had to use immediately?', 'text')
) AS p(channel_slug, title, content, post_type)
JOIN public.channels c ON c.slug = p.channel_slug;