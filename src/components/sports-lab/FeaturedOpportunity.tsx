import type { EbayListing } from '@/types/sportsEbay';

const GRADING_COST = 25;

const FALLBACK = {
  title: 'Monkey D. Luffy (Red Manga Alt Art) OP13-118 SEC — Carrying on His Will',
  rawPrice: 7000,
  psa10Value: 27000,
  profit: 19975,
  searchQuery: 'Monkey D. Luffy Manga Alt Art',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function insightText(profit: number): string {
  if (profit >= 5000) return 'Massive grading spread · backed by recent comps';
  if (profit >= 500) return 'Strong grading upside · backed by recent comps';
  return 'Notable spread · backed by recent comps';
}

interface FeaturedOpportunityProps {
  topListing: EbayListing | null;
  onExampleSearch?: (query: string) => void;
}

export function FeaturedOpportunity({ topListing, onExampleSearch }: FeaturedOpportunityProps) {
  const isLive = topListing !== null && topListing.price !== null && topListing.psa10MarketValue !== null;

  const title    = isLive ? topListing!.title               : FALLBACK.title;
  const rawPrice = isLive ? topListing!.price!              : FALLBACK.rawPrice;
  const psa10Val = isLive ? topListing!.psa10MarketValue!   : FALLBACK.psa10Value;
  const profit   = isLive ? psa10Val - rawPrice - GRADING_COST : FALLBACK.profit;
  const imageUrl = isLive ? topListing!.imageUrl            : null;
  const listingUrl = isLive ? topListing!.itemWebUrl        : null;

  const linkStyle = { color: 'var(--om-text-3)' } as React.CSSProperties;

  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)' }}
    >
      <div className="flex gap-4">
        {/* Image */}
        <div className="w-[88px] flex-shrink-0 sm:w-[120px]">
          <div
            className="aspect-square overflow-hidden rounded-lg flex items-center justify-center"
            style={{ background: 'var(--om-bg-3)' }}
          >
            {imageUrl
              ? <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
              : <span className="text-[10px] font-medium text-center px-2 leading-snug" style={{ color: 'var(--om-text-3)' }}>Example</span>
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          {/* Label + title */}
          <div>
            <span
              className="text-[10px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: 'var(--om-text-3)' }}
            >
              {isLive ? 'Top Opportunity' : 'Featured Opportunity'}
            </span>
            <h2
              className="mt-1 text-sm font-medium leading-snug line-clamp-2"
              style={{ color: 'var(--om-text-0)' }}
            >
              {title}
            </h2>
          </div>

          {/* Raw / PSA-10 */}
          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--om-text-3)' }}>
            <span>
              Raw:{' '}
              <span className="font-semibold tabular-nums" style={{ color: 'var(--om-text-1)' }}>
                ${fmt(rawPrice)}
              </span>
            </span>
            <span style={{ color: 'var(--om-border-1)' }}>·</span>
            <span>
              PSA 10:{' '}
              <span className="font-semibold tabular-nums" style={{ color: 'var(--om-text-1)' }}>
                ${fmt(psa10Val)}
              </span>
            </span>
          </div>

          {/* Profit hero */}
          <div
            className="flex items-center justify-between px-3 py-3 rounded-lg"
            style={{
              background: profit >= 0 ? 'rgba(46,229,157,0.08)' : 'rgba(255,92,122,0.08)',
              border: `1px solid ${profit >= 0 ? 'rgba(46,229,157,0.28)' : 'rgba(255,92,122,0.28)'}`,
            }}
          >
            <span
              className="text-[10px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: 'var(--om-text-3)' }}
            >
              Est. Profit
            </span>
            <span className={`text-3xl font-bold tabular-nums tracking-tight ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profit >= 0 ? '+' : '−'}${fmt(Math.abs(profit))}
            </span>
          </div>

          {/* Insight + CTA */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] min-w-0" style={{ color: 'var(--om-text-3)' }}>
              {insightText(profit)}
            </span>
            {listingUrl ? (
              <a
                href={listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="om-btn text-[11px] font-semibold flex-shrink-0 transition-colors"
                style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--om-text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--om-text-3)')}
              >
                View on eBay ↗
              </a>
            ) : onExampleSearch ? (
              <button
                onClick={() => onExampleSearch(FALLBACK.searchQuery)}
                className="om-btn text-[11px] font-semibold flex-shrink-0 transition-colors"
                style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--om-text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--om-text-3)')}
              >
                Find Opportunities →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
