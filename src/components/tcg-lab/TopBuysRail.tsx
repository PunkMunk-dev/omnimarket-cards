import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ExternalLink, TrendingUp, Zap } from 'lucide-react';
import type { TopRoiCard } from '@/hooks/useTopRoi';
import { useLiveBuyListings } from '@/hooks/useLiveBuyListings';

// ── Market Signals badge logic ────────────────────────────────────────────────

type BuyBadge = 'SAFE' | 'BREAKOUT' | 'SPEC';

interface MarketSignalCard {
  card: TopRoiCard;
  badge: BuyBadge;
  supportLine: string | null;
}

function deriveBadge(card: TopRoiCard): BuyBadge {
  if (card.isSafeFlip) return 'SAFE';
  if (card.profit >= 80 && card.confidenceLabel === 'High') return 'BREAKOUT';
  return 'SPEC';
}

function deriveSupportLine(badge: BuyBadge): string | null {
  if (badge === 'SAFE') return 'PSA 9 supports downside';
  if (badge === 'BREAKOUT') return 'High spread';
  return null;
}

const BADGE_STYLE: Record<BuyBadge, { label: string; color: string; bg: string; border: string }> = {
  SAFE:     { label: 'SAFE',     color: 'rgb(0,200,100)',   bg: 'rgba(0,200,100,0.10)',   border: 'rgba(0,200,100,0.25)'   },
  BREAKOUT: { label: 'BREAKOUT', color: 'rgb(255,160,50)',  bg: 'rgba(255,160,50,0.10)',  border: 'rgba(255,160,50,0.25)'  },
  SPEC:     { label: 'SPEC',     color: 'rgb(180,130,255)', bg: 'rgba(180,130,255,0.10)', border: 'rgba(180,130,255,0.25)' },
};

// ── Shared skeleton ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      className="shrink-0 rounded-2xl animate-pulse"
      style={{ width: 220, minWidth: 220, height: 200, background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)' }}
    />
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionLabel({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--om-text-2)' }}>
          {title}
        </span>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--om-text-3)' }}>{sub}</p>
      </div>
    </div>
  );
}

// ── Market Signals card ────────────────────────────────────────────────────────

function MarketSignalCard({ card, badge, supportLine }: MarketSignalCard) {
  const style = BADGE_STYLE[badge];
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.product_name + ' PSA 10')}&LH_Complete=1&LH_Sold=1&_sacat=183454`;

  return (
    <a
      href={ebayUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 rounded-2xl flex flex-col transition-all"
      style={{ width: 220, minWidth: 220, padding: '16px', background: 'var(--om-bg-1)', border: '1px solid var(--om-border-0)', textDecoration: 'none' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = style.border)}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--om-border-0)')}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded-full"
          style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
        >
          {style.label}
        </span>
        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'var(--om-text-2)' }} />
      </div>

      <p className="text-[12px] font-semibold leading-snug line-clamp-2 mb-4" style={{ color: 'var(--om-text-0)' }}>
        {card.product_name}
      </p>

      <div className="mb-3 mt-auto">
        <p className="text-[28px] font-black tabular-nums leading-none" style={{ color: 'rgb(0,200,100)' }}>
          +${card.profit.toFixed(0)}
        </p>
        <p className="text-[9px] mt-0.5 font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--om-text-3)' }}>
          potential
        </p>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>Raw Est.</p>
          <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--om-text-1)' }}>${card.loose_price.toFixed(0)}</p>
        </div>
        <span className="text-[10px] mx-0.5" style={{ color: 'var(--om-text-3)' }}>→</span>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>PSA 10 Est.</p>
          <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--om-text-1)' }}>${card.graded_price.toFixed(0)}</p>
        </div>
      </div>

      {supportLine && (
        <p className="text-[9px] font-medium" style={{ color: style.color, opacity: 0.85 }}>{supportLine}</p>
      )}
    </a>
  );
}

// ── Live Buy card ──────────────────────────────────────────────────────────────

function LiveBuyCard({ result }: { result: import('@/hooks/useLiveBuyListings').LiveBuyResult }) {
  const { card, listing, listingPrice, actualProfit } = result;
  const shippingCost = listing.shipping ? parseFloat(listing.shipping.cost) : 0;
  const totalCost = listingPrice + (isNaN(shippingCost) ? 0 : shippingCost);

  return (
    <a
      href={listing.itemWebUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 rounded-2xl flex flex-col overflow-hidden transition-all"
      style={{ width: 220, minWidth: 220, background: 'var(--om-bg-1)', border: '1px solid var(--om-border-0)', textDecoration: 'none' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(10,132,255,0.4)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--om-border-0)')}
    >
      {/* Listing image — fixed height for rail alignment */}
      <div className="relative w-full overflow-hidden shrink-0" style={{ height: 90, background: 'var(--om-bg-3)' }}>
        {listing.image ? (
          <img
            src={listing.image}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] font-medium" style={{ color: 'var(--om-text-3)' }}>No image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/60 text-white/90">
          LIVE
        </span>
        <ExternalLink className="absolute top-2 right-2 h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity text-white" />
      </div>

      <div className="flex flex-col flex-1 p-3">
        <p className="text-[11px] font-semibold leading-snug line-clamp-2 mb-2" style={{ color: 'var(--om-text-0)' }}>
          {listing.title}
        </p>

        {/* Buy Now price — real eBay listing price */}
        <div className="flex items-baseline gap-2 mb-1">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>Buy Now</p>
            <p className="text-[16px] font-black tabular-nums leading-none" style={{ color: 'var(--om-text-0)' }}>
              ${listingPrice.toFixed(0)}
            </p>
            {!isNaN(shippingCost) && shippingCost > 0 && (
              <p className="text-[9px]" style={{ color: 'var(--om-text-3)' }}>+${shippingCost.toFixed(0)} ship</p>
            )}
          </div>
          <span className="text-[10px]" style={{ color: 'var(--om-text-3)' }}>→</span>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>PSA 10 Est.</p>
            <p className="text-[16px] font-black tabular-nums leading-none" style={{ color: 'var(--om-text-1)' }}>
              ${card.graded_price.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Potential profit — uses actual listing price */}
        <div className="mt-auto pt-2" style={{ borderTop: '1px solid var(--om-border-0)' }}>
          <span className="text-[13px] font-bold tabular-nums" style={{ color: 'rgb(0,200,100)' }}>
            +${actualProfit.toFixed(0)}
          </span>
          <span className="ml-1 text-[9px]" style={{ color: 'var(--om-text-3)' }}>
            potential · incl. $25 grading
            {!isNaN(shippingCost) && shippingCost > 0 && ` · total $${totalCost.toFixed(0)}`}
          </span>
        </div>
      </div>
    </a>
  );
}

// ── Rail ───────────────────────────────────────────────────────────────────────

interface TopBuysRailProps {
  cards: TopRoiCard[];
  isLoading: boolean;
}

export function TopBuysRail({ cards, isLoading }: TopBuysRailProps) {
  const marketSignals = useMemo((): MarketSignalCard[] => {
    return cards
      .filter(c => c.profit > 0 && c.loose_price >= 10)
      .slice(0, 5)
      .map(card => {
        const badge = deriveBadge(card);
        return { card, badge, supportLine: deriveSupportLine(badge) };
      });
  }, [cards]);

  // Use top 3 cards for live buy searches (keeps API calls minimal)
  const topThree = useMemo(() => cards.filter(c => c.profit > 0 && c.loose_price >= 10).slice(0, 3), [cards]);
  const { results: liveBuys, isLoading: liveBuysLoading } = useLiveBuyListings(topThree);

  const showLiveBuys = liveBuysLoading || liveBuys.length > 0;

  return (
    <section className="space-y-5">

      {/* ── Market Signals ──────────────────────────────────────────────────── */}
      <div>
        <SectionLabel
          icon={<TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--om-accent)' }} />}
          title="Market Signals"
          sub="PriceCharting estimates — ranked by PSA 10 spread and downside support"
        />
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : marketSignals.map(s => <MarketSignalCard key={s.card.id} {...s} />)
          }
        </div>
      </div>

      {/* ── Live Buys ───────────────────────────────────────────────────────── */}
      {showLiveBuys && (
        <div>
          <SectionLabel
            icon={<Zap className="h-3.5 w-3.5" style={{ color: 'rgb(255,160,50)' }} />}
            title="Live Buys"
            sub="Active eBay BIN listings priced under raw benchmark — actual purchasable prices"
          />
          <div
            className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {liveBuysLoading
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : liveBuys.map(result => <LiveBuyCard key={result.listing.itemId} result={result} />)
            }
          </div>
        </div>
      )}

    </section>
  );
}
