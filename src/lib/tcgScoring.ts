/**
 * tcgScoring.ts — single source of truth for all TCG card scoring logic.
 *
 * Consumers import pure functions and constants from here.
 * No React, no Supabase, no side-effects.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type HotnessLabel =
  | 'Heating Up'
  | 'Spread Widening'
  | 'High Upside'
  | 'New Release Momentum';

export type RoiBucket = 'Best ROI' | 'Best Spread' | 'High Confidence' | 'Emerging';

export type ConfidenceLabel = 'High' | 'Medium' | 'Low';

// ── Configurable constants ─────────────────────────────────────────────────────

export const THRESHOLDS = {
  // Pre-filter floors
  RAW_FLOOR: 15,           // ignore cards with raw price < $15
  GRADED_FLOOR: 50,        // ignore cards with graded price < $50
  SPREAD_FLOOR: 15,        // ignore cards where spread < $15

  // Opportunity score weights (sum to 100)
  ROI_WEIGHT: 40,
  SPREAD_WEIGHT: 30,
  CONFIDENCE_WEIGHT: 20,
  CHASE_WEIGHT: 10,

  // ROI log-scale denominator: log1p(3) means 300% ROI saturates the ROI component
  ROI_LOG_CAP: 3,

  // Spread cap: $500 spread saturates the spread component
  SPREAD_CAP_DOLLARS: 500,

  // Confidence label cutoffs (0–100 score)
  CONFIDENCE_HIGH: 70,
  CONFIDENCE_MEDIUM: 45,

  // Hotness thresholds
  HIGH_UPSIDE_MIN_ROI: 200,
  HIGH_UPSIDE_RAW_MIN: 10,
  HIGH_UPSIDE_RAW_MAX: 80,
  SPREAD_WIDENING_MIN_PROFIT: 80,
  HEATING_UP_MIN_ROI: 50,

  // Bucket entry criteria
  BUCKET_BEST_ROI_MIN_ROI: 100,
  BUCKET_BEST_SPREAD_MIN_PROFIT: 50,
  BUCKET_HIGH_CONF_MIN_PROFIT: 40,
} as const;

// ── Keyword lists ──────────────────────────────────────────────────────────────

/** Names containing any of these are filtered out before scoring. */
export const JUNK_TERMS: readonly string[] = [
  'lot ', ' lot', 'repack', ' pack', 'booster', 'box', 'bundle', 'sealed',
  'display', 'tin', 'code card', 'collection', 'binder', 'storage',
  'sleeve', 'protector', 'coin', 'token', 'energy card', 'trainer card',
  'figure', 'plush', 'mug', 'shirt', 'poster', 'art book',
];

/** Set tokens that indicate a new-release card. */
export const NEW_SET_TOKENS: readonly string[] = [
  'sv09', 'sv9', 'op13', 'op12', 'op11', 'op10',
  'twilight masquerade', 'stellar crown', 'shrouded fable',
  'paldean fates', 'journey together',
];

/** Character names that signal market heat. */
export const HEAT_NAMES: readonly string[] = [
  'charizard', 'luffy', 'mewtwo', 'pikachu', 'rayquaza',
  'shanks', 'umbreon', 'zoro', 'lugia', 'gengar',
];

/** Chase keyword tiers: [[terms, bonus_pts], ...] */
const CHASE_KEYWORDS: Array<[string[], number]> = [
  [['vmax', 'vstar', 'alt art', 'alternate art'], 10],
  [['full art', 'rainbow', 'illustration rare', 'special art'], 8],
  [['secret rare', 'hyper rare', 'gold star', '1st edition'], 6],
];

// ── Pre-filters ────────────────────────────────────────────────────────────────

/** Returns true if the card's prices pass the minimum floors. */
export function passesPriceFilter(
  raw: number | null | undefined,
  graded: number | null | undefined,
): boolean {
  if (!raw || !graded) return false;
  if (raw < THRESHOLDS.RAW_FLOOR) return false;
  if (graded < THRESHOLDS.GRADED_FLOOR) return false;
  if (graded <= raw) return false;
  if (graded - raw < THRESHOLDS.SPREAD_FLOOR) return false;
  return true;
}

/** Returns true if the card name contains no junk terms. */
export function passesNameFilter(name: string): boolean {
  const lower = name.toLowerCase();
  return !JUNK_TERMS.some(t => lower.includes(t));
}

// ── Confidence scoring ────────────────────────────────────────────────────────
//
// Three components:
//   Price quality  (0–40): rewards higher raw prices — more liquid, more data
//   Graded quality (0–30): rewards higher graded prices — meaningful ceiling
//   Multiplier sanity (0–30): penalizes unrealistic graded/raw multiples

function priceQualityPts(raw: number): number {
  if (raw >= 100) return 40;
  if (raw >= 50)  return 32;
  if (raw >= 25)  return 22;
  if (raw >= 15)  return 12;
  return 6;
}

function gradedQualityPts(graded: number): number {
  if (graded >= 500) return 30;
  if (graded >= 200) return 22;
  if (graded >= 100) return 15;
  if (graded >= 50)  return 8;
  return 0;
}

function multiplierSanityPts(raw: number, graded: number): number {
  // Graded/raw ratio: high ratios suggest data quality issues
  const mult = graded / raw;
  if (mult <= 4)  return 30;
  if (mult <= 8)  return 20;
  if (mult <= 15) return 10;
  return 0;
}

export function computeConfidence(
  raw: number,
  graded: number,
): { score: number; label: ConfidenceLabel } {
  const score = priceQualityPts(raw) + gradedQualityPts(graded) + multiplierSanityPts(raw, graded);
  const label: ConfidenceLabel =
    score >= THRESHOLDS.CONFIDENCE_HIGH   ? 'High' :
    score >= THRESHOLDS.CONFIDENCE_MEDIUM ? 'Medium' : 'Low';
  return { score, label };
}

// ── Opportunity scoring ───────────────────────────────────────────────────────
//
// Final score (0–100):
//   ROI component   (0–40): log-scaled — compresses extreme outliers
//   Spread component (0–30): dollar spread, capped at $500
//   Confidence boost (0–20): normalized confidence score
//   Chase keyword    (0–10): one-time boost for known chase variants

function computeRoiPts(roi: number): number {
  return (
    Math.min(Math.log1p(roi / 100) / Math.log1p(THRESHOLDS.ROI_LOG_CAP), 1.0) *
    THRESHOLDS.ROI_WEIGHT
  );
}

function computeSpreadPts(profit: number): number {
  return (
    (Math.min(profit, THRESHOLDS.SPREAD_CAP_DOLLARS) / THRESHOLDS.SPREAD_CAP_DOLLARS) *
    THRESHOLDS.SPREAD_WEIGHT
  );
}

function computeChaseBoost(nameLower: string): number {
  return CHASE_KEYWORDS.reduce<number>(
    (boost, [terms, pts]) =>
      boost === 0 && terms.some(t => nameLower.includes(t)) ? pts : boost,
    0,
  );
}

export function computeOpportunityScore(
  raw: number,
  graded: number,
  name: string,
  confidenceScore: number,
): number {
  const profit = graded - raw;
  const roi = (profit / raw) * 100;
  const nameLower = name.toLowerCase();
  return (
    computeRoiPts(roi) +
    computeSpreadPts(profit) +
    (confidenceScore / 100) * THRESHOLDS.CONFIDENCE_WEIGHT +
    computeChaseBoost(nameLower)
  );
}

// ── Hotness label ─────────────────────────────────────────────────────────────
//
// Only fires for Medium+ confidence to avoid surfacing low-data noise.

export function getHotnessLabel(
  name: string,
  profit: number,
  roi: number,
  raw: number,
  confidenceLabel: ConfidenceLabel,
): HotnessLabel | null {
  if (confidenceLabel === 'Low') return null;
  const lower = name.toLowerCase();
  if (NEW_SET_TOKENS.some(t => lower.includes(t))) return 'New Release Momentum';
  if (
    roi >= THRESHOLDS.HIGH_UPSIDE_MIN_ROI &&
    raw >= THRESHOLDS.HIGH_UPSIDE_RAW_MIN &&
    raw <= THRESHOLDS.HIGH_UPSIDE_RAW_MAX
  ) return 'High Upside';
  if (profit >= THRESHOLDS.SPREAD_WIDENING_MIN_PROFIT) return 'Spread Widening';
  if (roi >= THRESHOLDS.HEATING_UP_MIN_ROI && HEAT_NAMES.some(k => lower.includes(k))) return 'Heating Up';
  return null;
}

// ── ROI bucket ────────────────────────────────────────────────────────────────
//
// Priority order: High Confidence > Best ROI > Best Spread > Emerging.
// Cards in lower buckets may still be great — Emerging = honest "not yet proven".

export function getRoiBucket(
  roi: number,
  profit: number,
  confidenceLabel: ConfidenceLabel,
): RoiBucket {
  if (confidenceLabel === 'High' && profit >= THRESHOLDS.BUCKET_HIGH_CONF_MIN_PROFIT) return 'High Confidence';
  if (roi >= THRESHOLDS.BUCKET_BEST_ROI_MIN_ROI && confidenceLabel !== 'Low') return 'Best ROI';
  if (profit >= THRESHOLDS.BUCKET_BEST_SPREAD_MIN_PROFIT && confidenceLabel !== 'Low') return 'Best Spread';
  return 'Emerging';
}
