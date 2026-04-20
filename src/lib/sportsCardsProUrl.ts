const BANNED_TERMS = [
  'lot', 'lots', 'break', 'breaks', 'breaking', 'case', 'cases',
  'sealed', 'box', 'boxes', 'pack', 'packs', 'digital', 'custom',
  'repack', 'repacked', 'mystery', 'random', 'investment',
  'invest', 'hot', 'gem', 'mint', 'candidate', 'ready', 'potential',
  'look', 'must', 'rare', 'wow', 'fire', 'huge', 'nice', 'sharp',
  'clean', 'beauty', 'great', 'amazing', 'awesome', 'perfect',
  'incredible', 'stunning', 'gorgeous', 'beautiful', 'sick', 'insane',
  'free', 'shipping', 'fast', 'check', 'see', 'store', 'other', 'items',
  'combined', 'discount', 'sale', 'deal', 'offer', 'obo', 'best',
  'ebay', 'auction', 'buy', 'now', 'price', 'reduced', 'cheap',
  'psa', 'bgs', 'sgc', 'cgc', 'csg', 'centering', 'corners', 'edges', 'surface',
  'the', 'and', 'for', 'with', 'new', 'get', 'your', 'this', 'that'
];

const MAX_QUERY_LENGTH = 120;

export type Confidence = 'high' | 'medium' | 'low';

export interface SportsCardsProUrlResult {
  url: string;
  query: string;
  confidence: Confidence;
}

interface CardMetadata {
  playerName: string;
  brand?: string;
  year?: string;
  traits?: string[];
  title?: string;
}

function sanitizeForSearch(input: string): string {
  let result = input.replace(/#/g, ' ').replace(/[()[\]{}]/g, '').replace(/["'`]/g, '').replace(/[/,\\]/g, ' ');
  BANNED_TERMS.forEach(term => { result = result.replace(new RegExp(`\\b${term}\\b`, 'gi'), ''); });
  result = result.replace(/\s+/g, ' ').trim();
  if (result.length > MAX_QUERY_LENGTH) {
    const truncated = result.substring(0, MAX_QUERY_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    result = lastSpace > MAX_QUERY_LENGTH * 0.7 ? truncated.substring(0, lastSpace).trim() : truncated.trim();
  }
  return result;
}

function extractCardNumber(title?: string): string | null {
  if (!title) return null;
  const patterns = [/#\s*([A-Z]*-?\d+)/i, /No\.?\s*([A-Z]*-?\d+)/i, /\b([A-Z]{1,3}-\d+)\b/];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match?.[1] && !title.includes(`/${match[1]}`)) {
      if (match[1] === '10' && /PSA\s*10/i.test(title)) continue;
      return match[1];
    }
  }
  return null;
}

function buildOptimizedQuery(card: CardMetadata): { query: string; confidence: Confidence } {
  const parts: string[] = [];
  let confidence: Confidence = 'low';
  const cardNumber = extractCardNumber(card.title);
  const titleLower = card.title?.toLowerCase() || '';
  const hasRookie = titleLower.includes(' rc ') || titleLower.includes('rookie') || card.traits?.some(t => t.toLowerCase().includes('rookie'));

  if (card.year) parts.push(card.year);
  if (card.brand) parts.push(card.brand);
  if (card.playerName) parts.push(card.playerName);
  if (cardNumber) { parts.push(cardNumber); confidence = 'high'; }
  if (hasRookie && !parts.some(p => p.toLowerCase().includes('rc'))) parts.push('RC');
  parts.push('PSA 10');

  if (card.year && card.playerName && parts.length >= 4) return { query: parts.join(' '), confidence };
  if (card.playerName && cardNumber) return { query: parts.join(' '), confidence: 'medium' };

  if (card.title) {
    const sanitized = sanitizeForSearch(card.title);
    const cleanQuery = sanitized.replace(/\b(psa|bgs|sgc)\s*\d+\b/gi, '').trim();
    return { query: `${cleanQuery} PSA 10`.replace(/\s+/g, ' ').trim(), confidence: cardNumber ? 'medium' : 'low' };
  }

  return { query: parts.join(' '), confidence: 'low' };
}

export function buildEbaySoldPsa10Url(card: CardMetadata): SportsCardsProUrlResult {
  if (card.title?.trim()) {
    let query = card.title.replace(/#/g, ' ').replace(/\b(free\s*ship\w*|hot|invest\w*|wow|fire|look|must\s*see)\b/gi, '')
      .replace(/[-–—]+\s*(free|fast|check)/gi, '').replace(/[!?]+/g, '').replace(/\s+/g, ' ').trim();
    if (!/\bpsa\s*10\b/i.test(query)) query = `${query} PSA 10`;
    const url = new URL('https://www.ebay.com/sch/i.html');
    url.searchParams.set('_nkw', query);
    url.searchParams.set('_sacat', '212');
    url.searchParams.set('LH_Sold', '1');
    url.searchParams.set('LH_Complete', '1');
    url.searchParams.set('_sop', '13');
    return { url: url.toString(), query, confidence: 'high' };
  }
  const parts: string[] = [];
  if (card.year) parts.push(card.year);
  if (card.brand) parts.push(card.brand);
  if (card.playerName) parts.push(card.playerName);
  parts.push('PSA 10');
  const query = parts.join(' ');
  const url = new URL('https://www.ebay.com/sch/i.html');
  url.searchParams.set('_nkw', query);
  url.searchParams.set('_sacat', '212');
  url.searchParams.set('LH_Sold', '1');
  url.searchParams.set('LH_Complete', '1');
  url.searchParams.set('_sop', '13');
  return { url: url.toString(), query, confidence: parts.length >= 3 ? 'medium' : 'low' };
}

export function buildGemRateUrl(card: CardMetadata): SportsCardsProUrlResult {
  const { query, confidence } = buildOptimizedQuery(card);
  if (query.trim()) return { url: `https://www.gemrate.com/search?q=${encodeURIComponent(query)}`, query, confidence };
  if (card.playerName?.trim()) {
    const fallback = `${card.playerName.trim()} PSA 10`;
    return { url: `https://www.gemrate.com/search?q=${encodeURIComponent(fallback)}`, query: fallback, confidence: 'low' };
  }
  return { url: 'https://www.gemrate.com/search?q=', query: '', confidence: 'low' };
}
