import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ExternalLink, TrendingUp, Zap } from 'lucide-react';
import type { TopRoiCard } from '@/hooks/useTopRoi';
import type { LiveBuyResult } from '@/hooks/useLiveBuyListings';
import { useLiveBuyListings } from '@/hooks/useLiveBuyListings';
import type { Game } from '@/types/tcg';

// ── Badge logic (shared by both card types) ───────────────────────────────────

type BuyBadge = 'SAFE' | 'BREAKOUT' | 'SPEC';

function deriveBadge(card: TopRoiCard): BuyBadge {
  if (card.isSafeFlip) return 'SAFE';
  if (card.profit >= 80 && card.confidenceLabel === 'High') return 'BREAKOUT';
  return 'SPEC';
}

const BADGE_STYLE: Record<BuyBadge, { label: string; color: string; bg: string; border: string }> = {
  SAFE:     { label: 'SAFE · low risk',         color: 'rgb(0,200,100)',   bg: 'rgba(0,200,100,0.10)',   border: 'rgba(0,200,100,0.25)'   },
  BREAKOUT: { label: 'BREAKOUT · high upside',  color: 'rgb(255,160,50)',  bg: 'rgba(255,160,50,0.10)',  border: 'rgba(255,160,50,0.25)'  },
  SPEC:     { label: 'SPEC · PSA10 dependent',  color: 'rgb(180,130,255)', bg: 'rgba(180,130,255,0.10)', border: 'rgba(180,130,255,0.25)' },
};

// ── Support line derivation ───────────────────────────────────────────────────

/** Market Signals support line — based on DB-level card properties */
function marketSupportLine(badge: BuyBadge): string | null {
  if (badge === 'SAFE') return 'PSA 9 supports downside';
  if (badge === 'BREAKOUT') return 'High spread';
  return null;
}

/** Live Buy support line — uses actual listing price context */
function liveBuySupportLine(card: TopRoiCard, listingPrice: number, actualProfit: number): string {
  if (card.isSafeFlip) return 'PSA 9 supports downside';
  if (actualProfit >= 80) return 'Strong PSA 10 spread after grading';
  if (listingPrice <= card.loose_price) return 'Listing found near raw benchmark';
  return 'Positive spread after grading';
}

// ── Shared skeleton ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      className="shrink-0 rounded-2xl animate-pulse"
      style={{ width: 220, minWidth: 220, height: 220, background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)' }}
    />
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionLabel({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="shrink-0">{icon}</span>
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--om-text-2)' }}>
          {title}
        </span>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--om-text-3)' }}>{sub}</p>
      </div>
    </div>
  );
}

// ── Live Buy empty state ───────────────────────────────────────────────────────

function LiveBuysEmpty() {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-2"
      style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)' }}
    >
      <span className="text-[10px]" style={{ color: 'var(--om-text-3)' }}>
        No strong live buys right now.
      </span>
      <span className="text-[10px]" style={{ color: 'var(--om-text-3)', opacity: 0.6 }}>
        Market is clean — check Market Signals below.
      </span>
    </div>
  );
}

// ── Live Buy card ──────────────────────────────────────────────────────────────

function LiveBuyCard({ result }: { result: LiveBuyResult }) {
  const { card, listing, listingPrice, actualProfit } = result;
  const shippingCost = listing.shipping ? parseFloat(listing.shipping.cost) : NaN;
  const hasShipping = !isNaN(shippingCost) && shippingCost > 0;
  const badge = deriveBadge(card);
  const style = BADGE_STYLE[badge];
  const supportLine = liveBuySupportLine(card, listingPrice, actualProfit);

  return (
    <a
      href={listing.itemWebUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 rounded-2xl flex flex-col overflow-hidden transition-all"
      style={{ width: 220, minWidth: 220, background: 'var(--om-bg-1)', border: '1px solid var(--om-border-0)', textDecoration: 'none' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(10,132,255,0.40)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--om-border-0)')}
    >
      {/* Image — fixed 90px height for consistent rail alignment */}
      <div className="relative w-full shrink-0 overflow-hidden" style={{ height: 90, background: 'var(--om-bg-3)' }}>
        {listing.image ? (
          <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px]" style={{ color: 'var(--om-text-3)' }}>No image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/60 text-white/90">
          LIVE
        </span>
        <ExternalLink className="absolute top-2 right-2 h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity text-white" />
      </div>

      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Card title — 2-line clamp */}
        <p className="text-[11px] font-semibold leading-snug line-clamp-2" style={{ color: 'var(--om-text-0)' }}>
          {listing.title}
        </p>

        {/* 1. Profit — visual hero */}
        <div>
          <p className="text-[22px] font-black tabular-nums leading-none" style={{ color: 'rgb(0,200,100)' }}>
            +${actualProfit.toFixed(0)}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--om-text-3)' }}>
            est. profit · after ~$25 grading
          </p>
          <p className="text-[9px] mt-0.5 truncate" style={{ color: 'var(--om-text-3)' }}>
            {supportLine}
          </p>
        </div>

        {/* 2. Buy Now → PSA 10 Est. */}
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>Buy Now</p>
            <p className="text-[14px] font-bold tabular-nums leading-tight" style={{ color: 'var(--om-text-0)' }}>
              ${listingPrice.toFixed(0)}
            </p>
            {hasShipping && (
              <p className="text-[9px]" style={{ color: 'var(--om-text-3)' }}>+${shippingCost.toFixed(0)} ship</p>
            )}
          </div>
          <span className="text-[10px] shrink-0" style={{ color: 'var(--om-text-3)' }}>→</span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>PSA 10 Est.</p>
            <p className="text-[14px] font-bold tabular-nums leading-tight" style={{ color: 'var(--om-text-1)' }}>
              ${card.graded_price.toFixed(0)}
            </p>
          </div>
        </div>

        {/* 3. Confidence badge */}
        <div className="mt-auto">
          <span
            className="self-start text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
            style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
          >
            {style.label}
          </span>
        </div>
      </div>
    </a>
  );
}

// ── Market Signal card ─────────────────────────────────────────────────────────

interface MarketSignalCardProps {
  card: TopRoiCard;
  badge: BuyBadge;
  supportLine: string | null;
  onFindListings: (query: string, game: Game) => void;
}

function MarketSignalCard({ card, badge, supportLine, onFindListings }: MarketSignalCardProps) {
  const style = BADGE_STYLE[badge];
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.product_name + ' PSA 10')}&LH_Complete=1&LH_Sold=1&_sacat=183454`;
  const cardGame: Game = card.category === 'onepiece' ? 'one_piece' : 'pokemon';

  return (
    <div
      className="group shrink-0 rounded-2xl flex flex-col"
      style={{ width: 220, minWidth: 220, padding: '16px', background: 'var(--om-bg-1)', border: '1px solid var(--om-border-0)' }}
    >
      {/* Badge row */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap overflow-hidden text-ellipsis max-w-[80%]"
          style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
        >
          {style.label}
        </span>
        <a
          href={ebayUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-40 transition-opacity"
          title="View PSA 10 sold comps on eBay"
        >
          <ExternalLink className="h-3 w-3 shrink-0" style={{ color: 'var(--om-text-2)' }} />
        </a>
      </div>

      {/* Card name */}
      <p className="text-[12px] font-semibold leading-snug line-clamp-2 mb-3" style={{ color: 'var(--om-text-0)' }}>
        {card.product_name}
      </p>

      {/* Spread — hero number */}
      <div className="mb-3 mt-auto">
        <p className="text-[26px] font-black tabular-nums leading-none" style={{ color: 'rgb(0,200,100)' }}>
          +${card.profit.toFixed(0)}
        </p>
        <p className="text-[9px] mt-0.5 font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>
          spread
        </p>
      </div>

      {/* Raw Est. → PSA 10 Est. */}
      <div className="flex items-center gap-1.5 mb-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>Raw Est.</p>
          <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--om-text-1)' }}>${card.loose_price.toFixed(0)}</p>
        </div>
        <span className="text-[10px] mx-0.5 shrink-0" style={{ color: 'var(--om-text-3)' }}>→</span>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>PSA 10 Est.</p>
          <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--om-text-1)' }}>${card.graded_price.toFixed(0)}</p>
        </div>
      </div>

      {/* Support line / safe floor */}
      {(supportLine || card.isSafeFlip) && (
        <p className="text-[9px] font-medium mb-2" style={{ color: supportLine ? style.color : 'rgb(0,200,100)', opacity: 0.85 }}>
          {supportLine ?? 'Safe floor'}
        </p>
      )}

      {/* Primary CTA */}
      <button
        onClick={() => onFindListings(card.product_name, cardGame)}
        className="w-full text-[11px] font-semibold py-1.5 rounded-xl mt-auto transition-all"
        style={{
          background: 'rgba(10,132,255,0.12)',
          color: 'rgb(10,132,255)',
          border: '1px solid rgba(10,132,255,0.25)',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(10,132,255,0.20)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(10,132,255,0.12)')}
      >
        Find Live Listings
      </button>
      <p className="text-[9px] mt-1 text-center" style={{ color: 'var(--om-text-3)' }}>
        Compare listings against PSA 10 upside
      </p>
    </div>
  );
}

// ── Rail ───────────────────────────────────────────────────────────────────────

interface TopBuysRailProps {
  cards: TopRoiCard[];
  isLoading: boolean;
  onFindListings: (query: string, game: Game) => void;
}

export function TopBuysRail({ cards, isLoading, onFindListings }: TopBuysRailProps) {
  const qualifiedCards = useMemo(
    () => cards.filter(c => c.profit > 0 && c.loose_price >= 10),
    [cards],
  );

  const marketSignals = useMemo(
    () => qualifiedCards.slice(0, 5).map(card => ({
      card,
      badge: deriveBadge(card),
      supportLine: marketSupportLine(deriveBadge(card)),
    })),
    [qualifiedCards],
  );

  const topThree = useMemo(() => qualifiedCards.slice(0, 3), [qualifiedCards]);
  const { results: liveBuys, isLoading: liveBuysLoading } = useLiveBuyListings(topThree);

  // Live Buys section is always rendered (loading → skeletons, empty → empty state)
  // but only after market data has started loading (prevents premature skeleton flash)
  const showLiveBuysSection = isLoading || liveBuysLoading || liveBuys.length >= 0;
  const liveBuysDoneEmpty = !isLoading && !liveBuysLoading && liveBuys.length === 0;

  return (
    <section className="space-y-5">

      {/* ── 1. Live Buys — actionable first ─────────────────────────────────── */}
      <div>
        <SectionLabel
          icon={<Zap className="h-3.5 w-3.5" style={{ color: 'rgb(255,160,50)' }} />}
          title="Live Buys"
          sub="Actual listings you can buy right now"
        />
        {(isLoading || liveBuysLoading) ? (
          <div
            className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : liveBuysDoneEmpty ? (
          <LiveBuysEmpty />
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {liveBuys.map(result => <LiveBuyCard key={result.listing.itemId} result={result} />)}
          </div>
        )}
      </div>

      {/* ── 2. Market Signals — estimated intelligence second ────────────────── */}
      <div>
        <SectionLabel
          icon={<TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--om-accent)' }} />}
          title="Market Signals"
          sub="Strong spread opportunities — click Find Live Listings to compare active eBay cards"
        />
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : marketSignals.map(s => <MarketSignalCard key={s.card.id} {...s} onFindListings={onFindListings} />)
          }
        </div>
      </div>

    </section>
  );
}
