-- Add columns for tracking scraped data
ALTER TABLE historical_gem_rates 
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_fetched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS player_name TEXT,
ADD COLUMN IF NOT EXISTS card_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_historical_gem_rates_lookup 
ON historical_gem_rates (year, brand, product);

CREATE INDEX IF NOT EXISTS idx_historical_gem_rates_player 
ON historical_gem_rates (player_name) WHERE player_name IS NOT NULL;