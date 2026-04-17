-- Add is_resource flag for Posts vs Resources tabs
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_resource boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_posts_channel_resource ON public.posts(channel_id, is_resource, created_at DESC);

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-images
DO $$ BEGIN
  CREATE POLICY "post-images public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'post-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "approved members can upload post images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'post-images'
      AND auth.uid() IN (SELECT id FROM public.profiles WHERE is_approved = true)
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "users delete own post images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;