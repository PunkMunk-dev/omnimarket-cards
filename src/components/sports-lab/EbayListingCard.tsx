import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SoldCompsDialog } from './SoldCompsDialog';
import { GemRateBadge } from './GemRateBadge';
import { WatchlistStar } from './WatchlistStar';
import { buildEbaySoldPsa10Url, buildGemRateUrl } from '@/lib/sportsCardsProUrl';
import { cleanListingTitle } from '@/lib/cleanTitle';
import type { EbayListing } from '@/types/sportsEbay';

const GRADING_COST = 25;

export function EbayListingCard({ listing, sportKey, isAuctionMode }: { listing: EbayListing; sportKey?: string | null; isAuctionMode?: boolean }) {
  const [showComps, setShowComps] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isEndingSoon, setIsEndingSoon] = useState(false);
  const [imageSrc, setImageSrc] = useState(listing.imageUrl);
  const [imageError, setImageError] = useState(false);

  const isBuyItNow = listing.buyingOptions?.includes('FIXED_PRICE');
  const isAuction = listing.buyingOptions?.includes('AUCTION');

  const handleImageError = useCallback(() => {
    if (listing.imageUrl && !imageError) {
      setImageError(true);
      setImageSrc(listing.imageUrl.replace('/s-l1600', '/s-l500').replace('/s-l800', '/s-l300'));
    }
  }, [listing.imageUrl, imageError]);

  useEffect(() => {
    if (!isAuctionMode || !isAuction || !listing.itemEndDate) { setTimeRemaining(null); return; }
    const calc = () => {
      const diff = new Date(listing.itemEndDate!).getTime() - Date.now();
      if (diff <= 0) { setTimeRemaining(null); return; }
      setIsEndingSoon(diff < 5 * 60 * 1000);
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
      setTimeRemaining(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [isAuctionMode, isAuction, listing.itemEndDate]);

  const soldMarketValue = listing.psa10MarketValue ?? null;
  const soldConfidence = listing.psa10MarketValueConfidence ?? null;
  const soldComps = listing.psa10SoldComps ?? [];
  const canCalcProfit = isBuyItNow && soldMarketValue !== null && listing.price !== null;
  const expectedProfit = canCalcProfit ? soldMarketValue - listing.price! - GRADING_COST : null;

  const { url: ebaySoldUrl } = buildEbaySoldPsa10Url({ playerName: listing.searchContext?.playerName || '', brand: listing.searchContext?.brand, year: listing.searchContext?.year, traits: listing.searchContext?.traits, title: listing.title });
  const { url: gemRateUrl } = buildGemRateUrl({ playerName: listing.searchContext?.playerName || '', brand: listing.searchContext?.brand, year: listing.searchContext?.year, traits: listing.searchContext?.traits, title: listing.title });

  return (
    <>
      <div className="om-card overflow-hidden">
        <a href={listing.itemWebUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
          <div className="aspect-square overflow-hidden relative" style={{ background: 'var(--om-bg-3)' }}>
            {listing.imageUrl ? <img src={imageSrc || listing.imageUrl} alt={listing.title} className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.02]" loading="lazy" onError={handleImageError} /> :
              <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--om-text-3)' }}>No image</div>}
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <WatchlistStar listing={listing} />
              {isAuction && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-orange-400 bg-black/50 backdrop-blur-sm">Auction</span>}
              {isBuyItNow && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-green-400 bg-black/50 backdrop-blur-sm">BIN</span>}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  {listing.price !== null && <span className="text-lg font-bold text-white tabular-nums">${listing.price.toFixed(2)}</span>}
                  {listing.shippingCost !== null && listing.shippingCost > 0 && <span className="text-[11px] text-white/50">+${listing.shippingCost.toFixed(2)} ship</span>}
                </div>
                {isAuctionMode && isAuction && timeRemaining && <span className={cn("text-[11px] font-medium", isEndingSoon ? "text-orange-400" : "text-white/60")}>{timeRemaining}</span>}
              </div>
            </div>
          </div>
          <div className="p-3.5 space-y-2">
            <h3 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]" style={{ color: 'var(--om-text-0)' }}>{listing.title}</h3>

            {/* ── Profit hero — most visually important ── */}
            {expectedProfit !== null ? (
              <div className="pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                  className="flex items-center justify-between px-3 py-3 rounded-lg"
                  style={{
                    background: expectedProfit >= 0 ? 'rgba(46,229,157,0.08)' : 'rgba(255,92,122,0.08)',
                    border: `1px solid ${expectedProfit >= 0 ? 'rgba(46,229,157,0.28)' : 'rgba(255,92,122,0.28)'}`,
                  }}
                >
                  <span className="text-[10px] font-semibold tracking-[0.08em] uppercase" style={{ color: 'var(--om-text-3)' }}>Est. Profit</span>
                  <span className={cn("text-2xl font-bold tabular-nums tracking-tight", expectedProfit >= 0 ? "text-green-400" : "text-red-400")}>
                    {expectedProfit >= 0 ? '+' : '−'}${Math.abs(expectedProfit).toFixed(0)}
                  </span>
                </div>
              </div>
            ) : soldMarketValue !== null ? (
              /* Auction or no profit calc — PSA-10 guide becomes the secondary hero */
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'var(--om-bg-3)', border: '1px solid var(--om-border-0)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] font-medium" style={{ color: 'var(--om-text-3)' }}>PSA-10 Guide</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tabular-nums" style={{ color: 'var(--om-text-0)' }}>${soldMarketValue.toFixed(2)}</span>
                  {soldConfidence === 'low' && <span className="text-[10px]" style={{ color: 'var(--om-warning)' }} title="Low confidence">*</span>}
                  {soldComps.length > 0 && (
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowComps(true); }} style={{ color: 'var(--om-accent)' }}>
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* ── Supporting context: guide price when profit IS shown ── */}
            {expectedProfit !== null && soldMarketValue !== null && (
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--om-text-3)' }} onClick={(e) => e.stopPropagation()}>
                <span>PSA-10 Guide:</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--om-text-2)' }}>${soldMarketValue.toFixed(2)}</span>
                {soldConfidence === 'low' && <span style={{ color: 'var(--om-warning)' }} title="Low confidence">*</span>}
                {soldComps.length > 0 && (
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowComps(true); }} className="ml-0.5" style={{ color: 'var(--om-accent)' }}>
                    <Info className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* ── Utility row: research links + dimmed copy ── */}
            <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3.5">
                <a href={ebaySoldUrl} target="_blank" rel="noopener noreferrer" className="om-btn text-[11px] font-semibold transition-colors" style={{ color: 'var(--om-text-3)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--om-text-1)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--om-text-3)')}>PSA 10 ↗</a>
                <GemRateBadge searchContext={listing.searchContext} fallbackUrl={gemRateUrl} />
              </div>
              <button
                onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await navigator.clipboard.writeText(cleanListingTitle(listing.title)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="om-btn w-7 h-7 flex items-center justify-center rounded-md transition-all opacity-40 hover:opacity-80"
                style={{ background: 'var(--om-bg-3)', color: 'var(--om-text-2)' }}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </a>
      </div>
      <SoldCompsDialog open={showComps} onOpenChange={setShowComps} soldComps={soldComps} marketValue={soldMarketValue} confidence={soldConfidence} />
    </>
  );
}
