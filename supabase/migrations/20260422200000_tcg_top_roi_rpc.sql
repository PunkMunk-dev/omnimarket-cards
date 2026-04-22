-- TOP ROI RPC — returns ranked cards by blended profit score
-- Excludes junk/sealed/lot entries and applies configurable price floor

CREATE OR REPLACE FUNCTION public.get_tcg_top_roi(
  p_category  text    DEFAULT NULL,
  p_min_loose numeric DEFAULT 3,
  p_limit     int     DEFAULT 150
)
RETURNS TABLE (
  id              bigint,
  product_name    text,
  normalized_name text,
  category        text,
  loose_price     numeric,
  graded_price    numeric,
  profit          numeric,
  roi             numeric,
  blended_score   numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    id::bigint,
    product_name,
    normalized_name,
    category,
    loose_price,
    graded_price,
    ROUND((graded_price - loose_price)::numeric, 2)                             AS profit,
    ROUND(((graded_price - loose_price) / loose_price * 100)::numeric, 1)       AS roi,
    (
      -- ROI score: capped at 500% → 40 pts
      LEAST((graded_price - loose_price) / loose_price, 5.0) / 5.0 * 40.0
      -- Dollar spread score: capped at $500 → 30 pts
      + LEAST(graded_price - loose_price, 500.0) / 500.0 * 30.0
      -- Graded-price quality signal → up to 20 pts
      + CASE
          WHEN graded_price > 100 THEN 20.0
          WHEN graded_price > 50  THEN 15.0
          WHEN graded_price > 20  THEN 8.0
          ELSE 0.0
        END
      -- Chase keyword boost → up to 10 pts
      + CASE
          WHEN normalized_name ILIKE '%vmax%'
            OR normalized_name ILIKE '%vstar%'
            OR normalized_name ILIKE '%alt art%'
            OR normalized_name ILIKE '%alternate art%' THEN 10.0
          WHEN normalized_name ILIKE '%full art%'
            OR normalized_name ILIKE '%rainbow%'
            OR normalized_name ILIKE '%illustration rare%'
            OR normalized_name ILIKE '%special art%' THEN 8.0
          WHEN normalized_name ILIKE '%secret rare%'
            OR normalized_name ILIKE '%hyper rare%'
            OR normalized_name ILIKE '%gold star%'
            OR normalized_name ILIKE '%1st edition%' THEN 6.0
          ELSE 0.0
        END
    )::numeric AS blended_score
  FROM pricecharting_tcg_cards
  WHERE
    loose_price  IS NOT NULL
    AND graded_price IS NOT NULL
    AND loose_price  >= p_min_loose
    AND graded_price > loose_price
    -- Minimum spread of $5
    AND (graded_price - loose_price) >= 5
    -- Noise exclusions: sealed product, lots, packs, bulk
    AND normalized_name NOT ILIKE '%lot%'
    AND normalized_name NOT ILIKE '% pack%'
    AND normalized_name NOT ILIKE '%box%'
    AND normalized_name NOT ILIKE '%bundle%'
    AND normalized_name NOT ILIKE '%sealed%'
    AND normalized_name NOT ILIKE '%display%'
    AND normalized_name NOT ILIKE '%booster%'
    AND normalized_name NOT ILIKE '%tin%'
    AND normalized_name NOT ILIKE '%code card%'
    AND normalized_name NOT ILIKE '%collection%'
    -- Category filter (optional)
    AND (p_category IS NULL OR category = p_category)
  ORDER BY blended_score DESC
  LIMIT p_limit;
$$;

-- Grant anon access so the frontend client can call it
GRANT EXECUTE ON FUNCTION public.get_tcg_top_roi(text, numeric, int) TO anon, authenticated;
