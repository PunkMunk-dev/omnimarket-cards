-- Create table for caching PSA 10 reference images
CREATE TABLE public.psa10_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_identifier TEXT NOT NULL,
  search_query TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_psa10_references_card_identifier ON public.psa10_references(card_identifier);
CREATE INDEX idx_psa10_references_expires_at ON public.psa10_references(expires_at);

-- Enable RLS
ALTER TABLE public.psa10_references ENABLE ROW LEVEL SECURITY;

-- Allow public read access (cached reference images are not sensitive)
CREATE POLICY "psa10_references_public_read" ON public.psa10_references
  FOR SELECT USING (true);

-- Block client-side modifications (only edge functions should write)
CREATE POLICY "psa10_references_no_client_insert" ON public.psa10_references
  FOR INSERT WITH CHECK (false);

CREATE POLICY "psa10_references_no_client_update" ON public.psa10_references
  FOR UPDATE USING (false);

CREATE POLICY "psa10_references_no_client_delete" ON public.psa10_references
  FOR DELETE USING (false);