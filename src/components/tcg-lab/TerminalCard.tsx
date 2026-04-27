import { useState, useCallback } from 'react';
import { Copy, Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EbayListing, Game } from '@/types/tcg';
import { useSharedWatchlist } from '@/contexts/WatchlistContext';
import { tcgListingToEbayItem } from '@/lib/watchlistAdapters';
import { cleanListingTitle } from '@/lib/cleanTitle';
import { usePricechartingLookup } from '@/hooks/usePricechartingLookup';
import { useTcgGemRateSearch } from '@/hooks/useTcgGemRateSearch';
import { HotBadge } from './HotBadge';
import type { HotnessLabel } from '@/hooks/useTopRoi';
import { HEAT_NAMES, THRESHOLDS, psa9FloorLabel } from '@/lib/tcgScoring';

function deriveHotness(
  title: string,
  profit: number | null,
  roi: number | null,
  loosePrice: number,
): HotnessLabel | null {
  if (profit === null || roi === null) return null;
  if (
    roi >= THRESHOLDS.HIGH_UPSIDE_MIN_ROI &&
    loosePrice >= THRESHOLDS.HIGH_UPSIDE_RAW_MIN &&
    loosePrice <= THRESHOLDS.HIGH_UPSIDE_RAW_MAX
  ) return 'High Upside';
  if (profit >= THRESHOLDS.SPREAD_WIDENING_MIN_PROFIT) return 'High Spread';
  const name = title.toLowerCase();
  if (roi >= THRESHOLDS.HEATING_UP_MIN_ROI && HEAT_NAMES.some(k => name.includes(k))) return 'Heating Up';
  return null;
}

// Pill style by confidence label
const GEM_CONF_COLOR = {
  high:   'rgb(0,200,100)',
  medium: 'rgb(200,160,0)',
  low:    'rgb(180,80,80)',
} as const;


interface TerminalCardProps {
  listing: EbayListing;
  game?: Game;
}

export function TerminalCard({ listing, game }: TerminalCardProps) {
  const { isInWatchlist, toggleWatchlist } = useSharedWatchlist();
  const watched = isInWatchlist(listing.itemId);
  const [copied, setCopied] = useState(false);

  // Clean title first — needed before hook calls that use it
  const cleanTitle = listing.title
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

  const { containerRef, pricingData, isLoading: isPricingLoading } = usePricechartingLookup(listing.title, game);

  const {
    containerRef: gemContainerRef,
    totalGrades,
    confidence: gemConfidence,
    loading: gemLoading,
  } = useTcgGemRateSearch({
    product_name: cleanTitle,
    normalized_name: pricingData?.matchedProductName || cleanTitle,
    category: (game === 'one_piece' ? 'one_piece' : 'pokemon'),
  });

  // Merge both IntersectionObserver refs onto the same root element
  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      (gemContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    // Refs are stable object references — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleToggleWatchlist = () => {
    toggleWatchlist(tcgListingToEbayItem(listing));
  };

  const isAuction = listing.listingType === 'AUCTION';
  const listingPrice = parseFloat(listing.price.value);

  const actualProfit =
    pricingData?.psa10MarketValue !== null && pricingData?.psa10MarketValue !== undefined && !isAuction && !isNaN(listingPrice)
      ? Math.round((pricingData.psa10MarketValue - listingPrice - 25) * 100) / 100
      : null;

  const actualRoi =
    actualProfit !== null && listingPrice > 0
      ? Math.round((actualProfit / listingPrice) * 100)
      : null;

  const showProfit = actualProfit !== null;
  const profitPositive = actualProfit !== null && actualProfit > 0;
  const spreadColor = profitPositive ? 'rgb(0,200,100)' : 'rgb(255,80,80)';
  const isApprox = pricingData?.matchConfidence === 'medium' || pricingData?.matchConfidence === 'low';

  // Panel visibility: PriceCharting and GemRate are independent
  const hasPricingContent = pricingData !== null &&
    (pricingData.rawMarketValue != null || pricingData.psa10MarketValue != null);
  const gemHasData = !gemLoading && totalGrades !== null && gemConfidence !== null;
  const showGemSection = gemLoading || gemHasData;
  // Content above the GemRate separator (determines whether separator renders)
  const hasTopContent = (!isAuction && showProfit) || hasPricingContent;
  // Every listing type shows the market panel (with appropriate fallback text when enrichment is missing)
  const showPanel = true;

  const hotnessLabel = deriveHotness(listing.title, actualProfit, actualRoi, listingPrice);

  return (
    <div ref={mergedRef} className="om-card overflow-hidden">
      <a href={listing.itemWebUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
        <div className="aspect-square overflow-hidden relative" style={{ background: 'var(--om-bg-3)' }}>
          <img src={listing.image} alt={cleanTitle} className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.02]" loading="lazy" />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white/90 bg-black/50 backdrop-blur-sm">eBay</span>
            {hotnessLabel && !isPricingLoading && <HotBadge label={hotnessLabel} size="xs" />}
          </div>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleWatchlist(); }}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors",
                watched ? "text-[var(--om-accent)]" : "text-white/70 hover:text-white"
              )}
            >
              <Star className={cn("h-3.5 w-3.5", watched && "fill-current")} />
            </button>
            {isAuction && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-orange-400 bg-black/50 backdrop-blur-sm">Auction</span>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                {isAuction && listing.price.value === '0.00' ? (
                  <span className="text-sm text-white/60 italic">No bids yet</span>
                ) : (
                  <span className="text-lg font-bold text-white tabular-nums">${listing.price.value}</span>
                )}
                {listing.shipping && parseFloat(listing.shipping.cost) > 0 && (
                  <span className="text-[11px] text-white/50">+${listing.shipping.cost} ship</span>
                )}
              </div>
              {isAuction && listing.timeRemaining && (
                <span className="text-[11px] font-medium text-white/60 flex items-center gap-1">
                  {listing.timeRemaining}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2.5">
          <h3 className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--om-text-0)' }}>{cleanTitle}</h3>

          {/* Market data panel — all listing types, but only rendered when there's data */}
          {showPanel && (
            <div
              className="rounded-lg px-3 py-2.5"
              style={{ background: 'var(--om-bg-3)', border: '1px solid var(--om-border-0)' }}
            >
              {isPricingLoading ? (
                <div className="flex items-center gap-1.5 py-1">
                  <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--om-text-3)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--om-text-3)' }}>Loading pricing data…</span>
                </div>
              ) : (
                <>
                  {/* Hero row: Spread est. + ROI est. — BIN only, requires psa10 value */}
                  {!isAuction && showProfit && (
                    <>
                      <div className="flex items-baseline justify-between gap-2 pb-0.5">
                        <span className="text-[15px] font-bold tabular-nums leading-none" style={{ color: spreadColor }}>
                          {profitPositive ? '+' : ''}${actualProfit!.toFixed(0)}
                        </span>
                        {actualRoi !== null && (
                          <span className="text-[13px] font-semibold tabular-nums leading-none" style={{ color: spreadColor }}>
                            {actualRoi > 0 ? '+' : ''}{actualRoi}%
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] pb-1.5 opacity-40" style={{ color: 'var(--om-text-3)' }}>Spread est. · ROI est.</p>
                    </>
                  )}

                  {/* Raw est. · PSA 9 est. · PSA 10 est. — shown whenever PriceCharting matched (BIN or auction) */}
                  {hasPricingContent && (
                    <p className="text-[10px] tabular-nums pb-1.5" style={{ color: 'var(--om-text-3)' }}>
                      {pricingData!.rawMarketValue != null && <>Raw est. ${pricingData!.rawMarketValue.toFixed(0)}</>}
                      {pricingData!.psa9MarketValue != null && <> · PSA 9 est. ${pricingData!.psa9MarketValue.toFixed(0)}</>}
                      {pricingData!.psa10MarketValue != null && <> · PSA 10 est. ${pricingData!.psa10MarketValue.toFixed(0)}</>}
                    </p>
                  )}

                  {/* PSA 9 floor label — only when psa9 data present and BIN */}
                  {!isAuction && pricingData?.psa9MarketValue != null && (
                    <p className="text-[9px] pb-1 opacity-60" style={{ color: 'var(--om-text-3)' }}>
                      {psa9FloorLabel(pricingData.psa9MarketValue, listingPrice)}
                    </p>
                  )}

                  {/* GemRate — independent of PriceCharting, shown whenever available */}
                  {showGemSection && (
                    <div style={hasTopContent ? { borderTop: '1px solid rgba(128,128,128,0.12)', paddingTop: '6px' } : undefined}>
                      {gemLoading ? (
                        <p className="text-[10px]" style={{ color: 'var(--om-text-3)' }}>Pop …</p>
                      ) : (
                        <p className="text-[10px] tabular-nums" style={{ color: 'var(--om-text-3)' }}>
                          Pop {totalGrades!.toLocaleString()}
                          {' · Match '}
                          <span style={{ color: GEM_CONF_COLOR[gemConfidence!] }}>
                            {gemConfidence!.charAt(0).toUpperCase() + gemConfidence!.slice(1)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {isApprox && (
                    <p className="text-[9px] mt-1 opacity-50" style={{ color: 'var(--om-text-3)' }}>approx.</p>
                  )}

                  {/* Fallback — BIN only, when neither source produced data */}
                  {!isAuction && !hasTopContent && !showGemSection && (
                    <div className="py-1">
                      <p className="text-[10px]" style={{ color: 'var(--om-text-3)' }}>No verified PSA 10 match</p>
                      <p className="text-[9px] mt-0.5 opacity-40" style={{ color: 'var(--om-text-3)' }}>Vague or custom listing titles may not match.</p>
                    </div>
                  )}
                  {/* Fallback — auction only, when neither source produced data */}
                  {isAuction && !hasTopContent && !showGemSection && (
                    <p className="text-[10px] py-1" style={{ color: 'var(--om-text-3)' }}>No verified market data</p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-end pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await navigator.clipboard.writeText(cleanListingTitle(listing.title));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="om-btn w-8 h-8 flex items-center justify-center rounded-md transition-all"
              style={{ background: 'var(--om-bg-3)', color: 'var(--om-text-2)' }}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </a>
    </div>
  );
}
