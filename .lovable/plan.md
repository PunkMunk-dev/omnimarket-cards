

# Add More Decorative Terms to Both Edge Functions

## What Changes
Add 6 new decorative/variant terms to the `DECORATIVE_TERMS` array in both edge functions so that searches like "Charizard reverse holo" or "Luffy leader card" correctly strip those terms for the eBay API call while boosting matching results to the top.

## New Terms Being Added
- `parallel rare` -- common in One Piece and other TCGs
- `leader card` -- One Piece TCG leader cards
- `promo` -- promotional cards across all TCGs
- `tournament pack` -- tournament-exclusive printings
- `stamped` -- stamped/foil variants
- `reverse holo` -- reverse holographic Pokemon cards

## Files Modified

### 1. `supabase/functions/ebay-search/index.ts` (Sports Lab search)
Update the `DECORATIVE_TERMS` array (lines 172-178) to add the 6 new terms.

### 2. `supabase/functions/tcg-ebay-search/index.ts` (TCG Lab search)
Update the `DECORATIVE_TERMS` array (lines 59-65) to add the same 6 new terms.

Both arrays will be kept in sync. No other code changes needed -- the existing `simplifyQuery` function already iterates over the full array.

