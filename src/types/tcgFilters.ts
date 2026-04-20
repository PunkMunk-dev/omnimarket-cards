import type { EbayListing, Game } from './tcg';

export type CardType = 'single' | 'slabbed' | 'sealed' | 'packs';
export type TcgLanguage = 'any' | 'en' | 'jp';

export type TcgRarity =
  | 'any'
  | 'alt_art'
  | 'secret_rare'
  | 'sar'
  | 'sir'
  | 'hyper_rare'
  | 'manga'
  | 'leader'
  | 'sp'
  | 'parallel';

export interface TcgFilterOptions {
  game: Game;
  cardType: CardType;
  hideDamaged: boolean;
  hideBlurry: boolean;
  dedupeEnabled: boolean;
  language?: TcgLanguage;
  cardNumber: string;
  rarity: TcgRarity;
}

export interface ProcessedListing extends EbayListing {
  imageQualityScore: number;
  dedupeKey: string;
  cardNumber: string | null;
  detectedLanguage: 'en' | 'jp' | 'any';
}

export const RARITY_SEARCH_MAP: Record<TcgRarity, string> = {
  any: '',
  alt_art: 'alt art',
  secret_rare: 'secret rare',
  sar: 'SAR',
  sir: 'SIR',
  hyper_rare: 'hyper rare',
  manga: 'manga rare',
  leader: 'leader',
  sp: 'SP',
  parallel: 'parallel',
};

export const RARITY_OPTIONS: { value: TcgRarity; label: string }[] = [
  { value: 'any', label: 'Any Rarity' },
  { value: 'alt_art', label: 'Alt Art' },
  { value: 'secret_rare', label: 'Secret Rare' },
  { value: 'sar', label: 'SAR' },
  { value: 'sir', label: 'SIR' },
  { value: 'hyper_rare', label: 'Hyper Rare' },
  { value: 'manga', label: 'Manga' },
  { value: 'leader', label: 'Leader' },
  { value: 'sp', label: 'SP' },
  { value: 'parallel', label: 'Parallel' },
];
