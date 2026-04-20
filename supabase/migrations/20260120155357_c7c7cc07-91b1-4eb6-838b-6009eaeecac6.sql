-- Create gem_scores table for caching Ximilar API results
CREATE TABLE public.gem_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  gem_score INTEGER,
  psa10_likelihood TEXT NOT NULL DEFAULT 'Low',
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  subgrades JSONB,
  error TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for caching by listing + image
CREATE UNIQUE INDEX gem_scores_listing_image_idx 
  ON public.gem_scores(listing_id, image_url);

-- Index for fast lookups
CREATE INDEX gem_scores_listing_idx ON public.gem_scores(listing_id);
CREATE INDEX gem_scores_updated_idx ON public.gem_scores(updated_at DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_gem_scores_updated_at
  BEFORE UPDATE ON public.gem_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.gem_scores ENABLE ROW LEVEL SECURITY;

-- Allow public reads (anyone can see cached scores)
CREATE POLICY "gem_scores_public_read" ON public.gem_scores
  FOR SELECT USING (true);

-- Block all client-side writes (only edge function can write via service role)
CREATE POLICY "gem_scores_no_client_insert" ON public.gem_scores
  FOR INSERT WITH CHECK (false);

CREATE POLICY "gem_scores_no_client_update" ON public.gem_scores
  FOR UPDATE USING (false);

CREATE POLICY "gem_scores_no_client_delete" ON public.gem_scores
  FOR DELETE USING (false);