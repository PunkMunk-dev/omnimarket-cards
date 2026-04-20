-- Create dedicated PSA population cache table with 48hr TTL
CREATE TABLE public.psa_population_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_slug TEXT UNIQUE NOT NULL,
  psa_url TEXT,
  psa10_count INTEGER,
  total_count INTEGER,
  gem_rate FLOAT,
  source TEXT DEFAULT 'firecrawl',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours')
);

-- Create indexes for fast lookups
CREATE INDEX idx_psa_cache_slug ON public.psa_population_cache(card_slug);
CREATE INDEX idx_psa_cache_expires ON public.psa_population_cache(expires_at);

-- Enable RLS
ALTER TABLE public.psa_population_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (cache is not user-specific)
CREATE POLICY "psa_population_cache_public_read" 
ON public.psa_population_cache 
FOR SELECT 
USING (true);

-- Restrict write operations to service role only
CREATE POLICY "psa_population_cache_no_client_insert" 
ON public.psa_population_cache 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "psa_population_cache_no_client_update" 
ON public.psa_population_cache 
FOR UPDATE 
USING (false);

CREATE POLICY "psa_population_cache_no_client_delete" 
ON public.psa_population_cache 
FOR DELETE 
USING (false);

-- Add comment for documentation
COMMENT ON TABLE public.psa_population_cache IS 'Cache for PSA population data from Firecrawl extract. 48hr TTL.';