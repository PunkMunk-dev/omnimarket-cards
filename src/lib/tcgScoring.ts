/**
 * tcgScoring.ts — single source of truth for all TCG card scoring logic.
 *
 * Consumers import pure functions and constants from here.
 * No React, no Supabase, no side-effects.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Standard PSA grading cost used across scoring, floor calculations, and UI. */
export const ESTIMATED_GRADING_COST = 25;

// ── Types ─────────────────────────────────────────────────────────────────────

export type HotnessLabel =
  | 'Heating Up'
  | 'High Spread'
  | 'High Upside'
  | 'New Release';

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

// ── PSA 9 floor scoring ───────────────────────────────────────────────────────
//
// Measures how much safety net the PSA-9 market provides relative to purchase price.
// When PSA9 > purchasePrice + $25 grading: positive floor; otherwise penalises.

/**
 * Returns -35 to +20 pts based on PSA 9 floor strength.
 * A positive floor means the card can likely be graded and sold at PSA 9
 * for a profit even if the PSA 10 market softens.
 */
export function computePsa9FloorScore(psa9: number, purchasePrice: number): number {
  const floorSpread = psa9 - purchasePrice - 25; // subtract $25 grading cost
  if (floorSpread >= 80)  return 20;
  if (floorSpread >= 40)  return 14;
  if (floorSpread >= 10)  return 8;
  if (floorSpread >= 0)   return 2;
  if (floorSpread >= -20) return -10;
  return -35;
}

/**
 * Human-readable floor label for the TerminalCard panel.
 * Uses the listing price as the purchase reference (not DB raw price).
 */
export function psa9FloorLabel(
  psa9: number,
  purchasePrice: number,
): 'Strong floor' | 'Break-even floor' | 'Weak floor' {
  const floorSpread = psa9 - purchasePrice - 25;
  if (floorSpread >= 10) return 'Strong floor';
  if (floorSpread >= 0)  return 'Break-even floor';
  return 'Weak floor';
}

/**
 * PSA 9-aware opportunity score.
 *
 * WITH PSA 9 data (max ~105 pts — intentionally can exceed 100; more data = more signal):
 *   ROI        40%
 *   Spread     25%
 *   PSA9 floor 20%  (−35 to +20 raw pts, normalized against 100-pt scale)
 *   Confidence 15%
 *   Chase      fixed pts (same as v1)
 *
 * WITHOUT PSA 9 data: v1 formula minus 7-pt uncertainty penalty (max ~93).
 */
export function computeOpportunityScoreV2(
  raw: number,
  graded: number,
  psa9: number | null,
  name: string,
  confidenceScore: number,
): number {
  const profit = graded - raw;
  const roi = (profit / raw) * 100;
  const nameLower = name.toLowerCase();
  const chaseBoost = computeChaseBoost(nameLower);

  if (psa9 !== null) {
    const roiPts    = computeRoiPts(roi) * (40 / THRESHOLDS.ROI_WEIGHT);       // rescale from 40→40
    const spreadPts = computeSpreadPts(profit) * (25 / THRESHOLDS.SPREAD_WEIGHT); // 30→25
    const confPts   = (confidenceScore / 100) * 15;                              // 20→15
    const floorPts  = computePsa9FloorScore(psa9, raw);                          // −35 to +20

    return roiPts + spreadPts + floorPts + confPts + chaseBoost;
  }

  // Without PSA 9: use v1 formula with -7 uncertainty penalty
  return (
    computeRoiPts(roi) +
    computeSpreadPts(profit) +
    (confidenceScore / 100) * THRESHOLDS.CONFIDENCE_WEIGHT +
    chaseBoost -
    7
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
  if (NEW_SET_TOKENS.some(t => lower.includes(t))) return 'New Release';
  if (
    roi >= THRESHOLDS.HIGH_UPSIDE_MIN_ROI &&
    raw >= THRESHOLDS.HIGH_UPSIDE_RAW_MIN &&
    raw <= THRESHOLDS.HIGH_UPSIDE_RAW_MAX
  ) return 'High Upside';
  if (profit >= THRESHOLDS.SPREAD_WIDENING_MIN_PROFIT) return 'High Spread';
  if (roi >= THRESHOLDS.HEATING_UP_MIN_ROI && HEAT_NAMES.some(k => lower.includes(k))) return 'Heating Up';
  return null;
}

// ── Safe flip ────────────────────────────────────────────────────────────────
//
// A flip is "safe" when the PSA 9 market alone covers the purchase + grading cost,
// providing a positive-EV exit even if the PSA 10 market softens.

/**
 * Returns true when PSA 9 market value >= purchasePrice + grading cost.
 * Returns false when psa9 is null (unknown floor = not safe by definition).
 */
export function isSafeFlip(psa9: number | null, purchasePrice: number): boolean {
  if (psa9 === null) return false;
  return psa9 >= purchasePrice + ESTIMATED_GRADING_COST;
}

/** Format a dollar spread as "+$123" or "-$45". */
export function formatSpread(value: number): string {
  const abs = Math.abs(Math.round(value));
  return value >= 0 ? `+$${abs}` : `-$${abs}`;
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
