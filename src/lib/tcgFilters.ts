import type { EbayListing, Game } from '@/types/tcg';
import type { TcgFilterOptions, ProcessedListing } from '@/types/tcgFilters';

// ── Blocklists ──────────────────────────────────────────────────────────

export const TCG_HARD_EXCLUDE_TERMS = [
  'lot', 'lots', 'bundle', 'bundles', 'collection', 'bulk',
  'you pick', 'choose', 'pick your', 'random', 'mystery',
  'replica', 'proxy', 'custom', 'fanmade', 'fan made',
  'digital', 'code', 'online',
  'playmat', 'deck box', 'deckbox', 'sleeves', 'toploader', 'binder',
  'empty', 'box only', 'case only',
  'break', 'breaks', 'repack', 'opened pack', 'pack opening',
  'inserts',
];

export const DAMAGED_TERMS = [
  'damaged', 'damage', 'heavy play', 'poor', 'crease', 'creased',
  'bent', 'bending', 'water', 'stain', 'stained', 'ink',
  'rip', 'tear', 'scratched', 'scratch', 'whitened',
  'corner wear', 'played',
];

const HP_RE = /\bHP\b/;

export const QUANTITY_PATTERN = /\b(\d+)\s*x\b|\bx\s*(\d+)\b|\bset\s+of\s+\d+\b|\b\d+\s*pcs\b|\b\d+\s*pieces\b/i;

export const POKEMON_CARD_NUMBER_RE = /\b\d{1,3}\/\d{1,3}\b/;
export const OP_CARD_NUMBER_RE = /\bOP\d{2}-\d{3}\b/i;
const GENERIC_CARD_NUMBER_RE = /\b[A-Z]{1,3}\d{2,3}[-/]\d{2,3}\b/i;

const GRADED_TERMS = ['psa', 'bgs', 'sgc', 'cgc', 'graded', 'slab', 'gem mint', 'beckett', 'ace', 'mnt'];

const STOP_WORDS = [
  'pokemon', 'one piece', 'tcg', 'card', 'near mint', 'nm', 'mint',
  'psa', 'bgs', 'cgc', 'graded', 'the', 'a', 'an', 'and', 'or', 'of',
  'for', 'in', 'on', 'with', 'to', 'is', 'it',
];

export function extractCardNumber(title: string, game: Game): string | null {
  if (game === 'pokemon') {
    const m = title.match(POKEMON_CARD_NUMBER_RE);
    if (m) return m[0];
  }
  if (game === 'one_piece') {
    const m = title.match(OP_CARD_NUMBER_RE);
    if (m) return m[0].toUpperCase();
  }
  const g = title.match(GENERIC_CARD_NUMBER_RE);
  return g ? g[0].toUpperCase() : null;
}

export function detectLanguage(title: string): 'en' | 'jp' | 'any' {
  const t = title.toLowerCase();
  if (/\bjapanese\b|\bjpn\b|\bjp\b|日本語/.test(t)) return 'jp';
  if (/\benglish\b|\beng\b/.test(t)) return 'en';
  return 'any';
}

export function computeImageQualityScore(listing: EbayListing): number {
  let score = 1.0;
  if (!listing.image || listing.image === '') return 0;

  const img = listing.image.toLowerCase();
  const title = listing.title.toLowerCase();

  if (img.includes('placeholder') || img.includes('no_image') || img.includes('noimage')) return 0;
  if (title.includes('stock photo') || title.includes('no photo')) return 0;

  if (img.includes('s-l64') || img.includes('s-l96') || img.includes('s-l140')) {
    score -= 0.5;
  }

  if (img.includes('collage') || img.includes('lot') || img.includes('bundle')) {
    score -= 0.3;
  }

  return Math.max(0, Math.min(1, score));
}

function normalizeTitle(title: string): string {
  let t = title.toLowerCase();
  t = t.replace(/[^\w\s]/g, ' ');
  for (const sw of STOP_WORDS) {
    t = t.replace(new RegExp(`\\b${sw}\\b`, 'gi'), '');
  }
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function makeDedupeKey(listing: ProcessedListing): string {
  const norm = normalizeTitle(listing.title);
  const cn = listing.cardNumber || '';
  const lang = listing.detectedLanguage;
  return `${norm}|${cn}|${lang}`;
}

export function filterTcgListings(
  listings: EbayListing[],
  options: TcgFilterOptions
): { passed: ProcessedListing[]; removedCount: number; removedReasons: Record<string, number> } {
  const reasons: Record<string, number> = {};
  const passed: ProcessedListing[] = [];

  const inc = (reason: string) => { reasons[reason] = (reasons[reason] || 0) + 1; };

  for (const listing of listings) {
    const titleLower = listing.title.toLowerCase();

    if (TCG_HARD_EXCLUDE_TERMS.some(term => titleLower.includes(term))) {
      inc('hard_exclude'); continue;
    }

    if (options.cardType !== 'sealed' && options.cardType !== 'packs') {
      if (QUANTITY_PATTERN.test(listing.title)) {
        inc('quantity_pattern'); continue;
      }
    }

    if (options.hideDamaged) {
      if (DAMAGED_TERMS.some(term => titleLower.includes(term)) || HP_RE.test(listing.title)) {
        inc('damaged'); continue;
      }
    }

    if (options.cardType === 'single') {
      if (GRADED_TERMS.some(term => titleLower.includes(term))) {
        inc('graded_excluded'); continue;
      }
      if (listing.condition && listing.condition.toLowerCase() === 'graded') {
        inc('graded_excluded'); continue;
      }
    } else if (options.cardType === 'slabbed') {
      const hasGraded = GRADED_TERMS.some(term => titleLower.includes(term)) ||
        (listing.condition && listing.condition.toLowerCase() === 'graded');
      if (!hasGraded) {
        inc('not_graded'); continue;
      }
    }

    const imageQualityScore = computeImageQualityScore(listing);

    if (options.hideBlurry && imageQualityScore < 0.55) {
      inc('low_image_quality'); continue;
    }

    const detectedLanguage = detectLanguage(listing.title);
    const cardNumber = extractCardNumber(listing.title, options.game);

    const processed: ProcessedListing = {
      ...listing,
      imageQualityScore,
      dedupeKey: '',
      cardNumber,
      detectedLanguage,
    };
    processed.dedupeKey = makeDedupeKey(processed);

    passed.push(processed);
  }

  return { passed, removedCount: listings.length - passed.length, removedReasons: reasons };
}

export function dedupeTcgListings(
  listings: ProcessedListing[]
): { deduped: ProcessedListing[]; duplicatesRemoved: number } {
  const groups = new Map<string, ProcessedListing[]>();

  for (const l of listings) {
    const key = l.dedupeKey;
    const arr = groups.get(key);
    if (arr) arr.push(l);
    else groups.set(key, [l]);
  }

  const deduped: ProcessedListing[] = [];
  let removed = 0;

  for (const [, group] of groups) {
    if (group.length === 1) {
      deduped.push(group[0]);
      continue;
    }

    group.sort((a, b) => {
      if (b.imageQualityScore !== a.imageQualityScore) return b.imageQualityScore - a.imageQualityScore;
      const pa = parseFloat(a.price.value);
      const pb = parseFloat(b.price.value);
      if (pa !== pb) return pa - pb;
      return 0;
    });

    deduped.push(group[0]);
    removed += group.length - 1;
  }

  return { deduped, duplicatesRemoved: removed };
}
