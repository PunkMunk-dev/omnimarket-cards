export function cleanListingTitle(title: string): string {
  let cleaned = title;

  // Remove emojis
  cleaned = cleaned
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '');

  // Remove grading company + grade patterns (PSA 10, BGS 9.5, SGC 98, etc.)
  cleaned = cleaned.replace(/\b(PSA|BGS|SGC|CGC|GMA|HGA|CSG|KSA|MNT|BCCG|ACE|TAG|AGS|CGA|CCIC)\s*\d+\.?\d*\b/gi, '');
  // Remove standalone grading keywords
  cleaned = cleaned.replace(/\b(graded|slab|slabbed|authenticated|gem\s*mint|gem-mint)\b/gi, '');

  // Remove population data
  cleaned = cleaned.replace(/\b(low\s+)?pop(ulation)?[:\s]*\d+(\s*[/]\s*\d+)?(\s+of\s+\d+)?\b/gi, '');

  // Remove currency symbols and price-like patterns
  cleaned = cleaned.replace(/\$+/g, '');
  cleaned = cleaned.replace(/\b\d+\s*(?:USD|EUR|GBP)\b/gi, '');

  // Remove repeated punctuation (!!, @@, etc.)
  cleaned = cleaned.replace(/([!@#%^&*])\1+/g, '');

  // Remove seller promo phrases
  cleaned = cleaned.replace(/\b(free\s+shipping|ships?\s+free|fast\s+ship(ping)?|must\s+see|invest|hot|fire|rare|wow|l@@k|look|📈|🔥)\b/gi, '');

  // Remove eBay listing filler words
  cleaned = cleaned.replace(/\b(lot|repack|mystery|bundle|break|pack|box|hobby)\b/gi, '');

  // Remove parenthetical notes like (Read Description), (PSA 10), etc.
  cleaned = cleaned.replace(/\([^)]{0,40}\)/g, '');

  // Remove standalone card condition shorthand
  cleaned = cleaned.replace(/\b(NM|NM\+|NM-MT|MINT|NEAR MINT|EX|VG|GOOD)\b/gi, '');

  // Remove sport category words (too broad for search)
  cleaned = cleaned.replace(/\b(basketball|football|baseball|soccer|hockey)\b/gi, '');

  // Remove generic card terms
  cleaned = cleaned.replace(/\b(rookie\s+card|card|cards)\b/gi, '');

  // Convert card number hash to slash format (#256 -> /256) for broader eBay matching
  cleaned = cleaned.replace(/#(\d+)/g, '/$1');


  // Clean remaining punctuation from word boundaries
  cleaned = cleaned.replace(/[!?]+/g, '');

  // Remove trailing/leading dashes, pipes, slashes used as separators
  cleaned = cleaned.replace(/[|~]/g, ' ');

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[\s\-–—,]+|[\s\-–—,]+$/g, '').trim();

  return cleaned;
}

export function extractSearchQuery(title: string, maxWords = 8): string {
  const cleaned = cleanListingTitle(title);
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  return words.slice(0, maxWords).join(' ');
}
