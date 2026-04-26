-- ── PriceCharting data layer optimizations ─────────────────────────────────
--
-- 1. pricecharting_cache: add pricecharting_id column so stale cache entries
--    can be refreshed via direct row lookup (id = X) instead of re-running
--    fuzzy matching. Index kept sparse (partial) since older rows have NULL.
--
-- 2. pricecharting_tcg_cards: add grade9_price column to store PSA-9-equivalent
--    market values imported from PriceCharting CSV (grade9-price field).

-- Cache table: product ID for deterministic re-lookup on cache expiry
ALTER TABLE public.pricecharting_cache
  ADD COLUMN IF NOT EXISTS pricecharting_id bigint;

CREATE INDEX IF NOT EXISTS idx_pc_cache_product_id
  ON public.pricecharting_cache (pricecharting_id)
  WHERE pricecharting_id IS NOT NULL;

-- Card data table: PSA 9 equivalent market price
ALTER TABLE public.pricecharting_tcg_cards
  ADD COLUMN IF NOT EXISTS grade9_price numeric;

-- CSV import note (for future refreshes):
--   loose-price    → loose_price   (divide pennies by 100)
--   graded-price   → graded_price  (PSA 10 — divide by 100)
--   grade9-price   → grade9_price  (PSA 9  — divide by 100)
--   id             → stored in cache.pricecharting_id after first match
