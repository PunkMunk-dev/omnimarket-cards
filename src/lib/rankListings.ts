import type { EbayListing } from '@/types/sportsEbay';

const JUNK_KEYWORDS = ['lot', 'repack', 'mystery', 'bundle', 'set of', 'collection', 'pick your', 'choose your'];

export function scoreRelevance(listing: EbayListing): number {
  const ctx = listing.searchContext;
  if (!ctx?.playerName) return listing.imageQualityScore ?? 0;

  const title = listing.title.toLowerCase();
  const playerName = ctx.playerName.toLowerCase().trim();
  const parts = playerName.split(/\s+/);
  const lastName = parts[parts.length - 1];
  const firstName = parts[0];

  let score = 0;

  // Player name matching
  if (title.includes(playerName)) {
    score += 50; // full name match
  } else if (parts.length >= 2 && title.includes(firstName) && title.includes(lastName)) {
    score += 30; // first + last, non-contiguous
  } else if (title.includes(lastName)) {
    score += 15; // last name only
  } else {
    score -= 20; // player not found — likely off-topic result
  }

  // Year match
  if (ctx.year && title.includes(ctx.year)) score += 20;

  // Brand match
  if (ctx.brand) {
    const brand = ctx.brand.toLowerCase();
    if (title.includes(brand)) score += 15;
  }

  // Trait matches
  if (ctx.traits && ctx.traits.length > 0) {
    for (const trait of ctx.traits) {
      if (title.includes(trait.toLowerCase())) score += 10;
    }
  }

  // Image quality bonus (scaled down — secondary signal)
  if (listing.imageQualityScore != null) score += listing.imageQualityScore * 0.5;

  // Junk keyword penalty
  for (const junk of JUNK_KEYWORDS) {
    if (title.includes(junk)) { score -= 30; break; }
  }

  return score;
}
