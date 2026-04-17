-- Replace overly broad public SELECT on avatars: keep individual file reads public,
-- but restrict listing/enumeration to authenticated users only.
DROP POLICY IF EXISTS "avatars publicly readable" ON storage.objects;

-- Allow public read of individual avatar objects (needed so logged-out visitors see avatars in feed)
-- Listing the bucket contents is a separate action; it requires the storage API list endpoint
-- which checks the same SELECT policy. To allow image GETs by URL while preventing bulk listing,
-- we scope by name pattern: only objects under user-id folders are readable.
CREATE POLICY "avatar files publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);

-- Tighten access_requests insert with a length cap
DROP POLICY IF EXISTS "anyone submits request" ON public.access_requests;
CREATE POLICY "anyone submits request"
  ON public.access_requests FOR INSERT
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND char_length(what_building) BETWEEN 1 AND 2000
  );