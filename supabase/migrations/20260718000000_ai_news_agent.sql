-- ─── AI News Agent Migration ───────────────────────────────────────────────────
-- Run this in your Supabase SQL editor

-- 1. Bot profile: "AI Scout 🤖" — acts as the news poster
INSERT INTO profiles (id, display_name, avatar_url, is_approved, is_admin)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'AI Scout 🤖',
  null,
  true,
  false
) ON CONFLICT (id) DO NOTHING;

-- 2. Deduplication table — tracks URLs already posted so we never re-post
CREATE TABLE IF NOT EXISTS ai_news_posted (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url       text UNIQUE NOT NULL,
  posted_at timestamptz DEFAULT now()
);

-- Enable RLS (service role bypasses it anyway)
ALTER TABLE ai_news_posted ENABLE ROW LEVEL SECURITY;

-- 3. Add agent control columns to admin_settings
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS ai_news_agent_enabled  boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_news_agent_frequency_hours integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS ai_news_last_run timestamptz;

-- 4. Insert defaults if the admin_settings row doesn't have them yet
UPDATE admin_settings
SET
  ai_news_agent_enabled         = COALESCE(ai_news_agent_enabled, true),
  ai_news_agent_frequency_hours = COALESCE(ai_news_agent_frequency_hours, 6)
WHERE id = 1;
