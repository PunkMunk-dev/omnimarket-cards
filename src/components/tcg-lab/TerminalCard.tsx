import { useState } from 'react';
import { Copy, Check, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EbayListing } from '@/types/tcg';
import { useSharedWatchlist } from '@/contexts/WatchlistContext';
import { tcgListingToEbayItem } from '@/lib/watchlistAdapters';
import { cleanListingTitle } from '@/lib/cleanTitle';
import { usePricechartingLookup } from '@/hooks/usePricechartingLookup';

interface TerminalCardProps {
  listing: EbayListing;
}

export function TerminalCard({ listing }: TerminalCardProps) {
  const { isInWatchlist, toggleWatchlist } = useSharedWatchlist();
  const watched = isInWatchlist(listing.itemId);
  const [copied, setCopied] = useState(false);

  const { containerRef, pricingData, isLoading: isPricingLoading } = usePricechartingLookup(listing.title);

  const handleToggleWatchlist = () => {
    toggleWatchlist(tcgListingToEbayItem(listing));
  };

  const cleanTitle = listing.title
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

  const isAuction = listing.listingType === 'AUCTION';
  const listingPrice = parseFloat(listing.price.value);

  // Profit relative to this specific eBay listing price (not raw market value)
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

  const gradedCompsUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cleanTitle + ' PSA 10')}&LH_Complete=1&LH_Sold=1&_sacat=183454`;
  const gemUrl = `https://www.gemrate.com/search?q=${encodeURIComponent(cleanTitle)}`;

  return (
    <div ref={containerRef} className="om-card overflow-hidden">
      <a href={listing.itemWebUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
        <div className="aspect-square overflow-hidden relative" style={{ background: 'var(--om-bg-3)' }}>
          <img src={listing.image} alt={cleanTitle} className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.02]" loading="lazy" />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white/90 bg-black/50 backdrop-blur-sm">eBay</span>
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
                  <Clock className="h-2.5 w-2.5" />
                  {listing.timeRemaining}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="p-3 space-y-2.5">
          <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]" style={{ color: 'var(--om-text-0)' }}>{cleanTitle}</h3>

          {/* Profit block — only for BIN listings with a match */}
          {!isAuction && (
            <div
              className="rounded-lg px-3 py-2.5"
              style={{
                background: isPricingLoading
                  ? 'var(--om-bg-3)'
                  : showProfit
                    ? profitPositive
                      ? 'rgba(0,200,100,0.07)'
                      : 'rgba(255,60,60,0.07)'
                    : 'transparent',
                border: isPricingLoading
                  ? '1px solid var(--om-border-0)'
                  : showProfit
                    ? profitPositive
                      ? '1px solid rgba(0,200,100,0.28)'
                      : '1px solid rgba(255,60,60,0.28)'
                    : '1px solid var(--om-border-0)',
                minHeight: '60px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              {isPricingLoading ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--om-text-3)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--om-text-3)' }}>Loading PSA 10 data…</span>
                </div>
              ) : showProfit ? (
                <>
                  <div className="flex items-baseline justify-between gap-1">
                    <span
                      className="text-[10px] font-semibold tracking-[0.08em] uppercase"
                      style={{ color: profitPositive ? 'rgba(0,200,100,0.7)' : 'rgba(255,80,80,0.7)' }}
                    >
                      Est. Profit
                    </span>
                    {pricingData?.matchConfidence === 'medium' && (
                      <span className="text-[9px]" style={{ color: 'var(--om-text-3)' }}>~est</span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: profitPositive ? 'rgb(0,200,100)' : 'rgb(255,80,80)' }}
                    >
                      {profitPositive ? '+' : ''}{actualProfit !== null ? `$${actualProfit.toFixed(0)}` : '—'}
                    </span>
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--om-text-2)' }}>
                      {actualRoi !== null && (
                        <span className="tabular-nums font-medium">{actualRoi > 0 ? '+' : ''}{actualRoi}%</span>
                      )}
                      {pricingData?.psa10MarketValue !== null && pricingData?.psa10MarketValue !== undefined && (
                        <span className="tabular-nums" style={{ color: 'var(--om-text-3)' }}>
                          PSA 10 ${pricingData.psa10MarketValue.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-[10px]" style={{ color: 'var(--om-text-3)' }}>No PSA 10 data</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <a href={gradedCompsUrl} target="_blank" rel="noopener noreferrer" className="om-btn min-w-[52px] text-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/80 text-white hover:bg-red-500 transition-colors">PSA 10</a>
            <a href={gemUrl} target="_blank" rel="noopener noreferrer" className="om-btn min-w-[42px] text-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/80 text-white hover:bg-blue-500 transition-colors">Gem</a>
          </div>
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
