import { useMemo } from 'react';
import { ExternalLink, TrendingUp } from 'lucide-react';
import type { TopRoiCard } from '@/hooks/useTopRoi';

// ── Badge logic ───────────────────────────────────────────────────────────────

type BuyBadge = 'SAFE' | 'BREAKOUT' | 'SPEC';

interface TopBuyCard {
  card: TopRoiCard;
  badge: BuyBadge;
  supportLine: string | null;
}

function deriveBadge(card: TopRoiCard): BuyBadge {
  if (card.isSafeFlip) return 'SAFE';
  if (card.profit >= 80 && card.confidenceLabel === 'High') return 'BREAKOUT';
  return 'SPEC';
}

function deriveSupportLine(badge: BuyBadge, card: TopRoiCard): string | null {
  if (badge === 'SAFE') return 'PSA 9 supports downside';
  if (badge === 'BREAKOUT') return 'High spread';
  if (card.psa9Spread !== null && card.psa9Spread > 0) return 'Recent comps stable';
  return null;
}

const BADGE_STYLE: Record<BuyBadge, { label: string; color: string; bg: string; border: string }> = {
  SAFE: {
    label: 'SAFE',
    color: 'rgb(0,200,100)',
    bg: 'rgba(0,200,100,0.10)',
    border: 'rgba(0,200,100,0.25)',
  },
  BREAKOUT: {
    label: 'BREAKOUT',
    color: 'rgb(255,160,50)',
    bg: 'rgba(255,160,50,0.10)',
    border: 'rgba(255,160,50,0.25)',
  },
  SPEC: {
    label: 'SPEC',
    color: 'rgb(180,130,255)',
    bg: 'rgba(180,130,255,0.10)',
    border: 'rgba(180,130,255,0.25)',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface TopBuysRailProps {
  cards: TopRoiCard[];
  isLoading: boolean;
}

export function TopBuysRail({ cards, isLoading }: TopBuysRailProps) {
  const topBuys = useMemo((): TopBuyCard[] => {
    return cards
      .filter(c => c.profit > 0 && c.loose_price >= 10)
      .slice(0, 5)
      .map(card => {
        const badge = deriveBadge(card);
        return { card, badge, supportLine: deriveSupportLine(badge, card) };
      });
  }, [cards]);

  const ebayUrl = (name: string) =>
    `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(name + ' PSA 10')}&LH_Complete=1&LH_Sold=1&_sacat=183454`;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-baseline gap-2 mb-1">
        <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--om-accent)' }} />
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--om-text-2)' }}>
            Top Buys Right Now
          </span>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--om-text-3)' }}>
            Live opportunities with strongest profit potential
          </p>
        </div>
      </div>

      {/* Horizontal scroll rail */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 rounded-2xl animate-pulse"
                style={{
                  width: 220,
                  minWidth: 220,
                  height: 192,
                  background: 'var(--om-bg-2)',
                  border: '1px solid var(--om-border-0)',
                }}
              />
            ))
          : topBuys.map(({ card, badge, supportLine }) => {
              const style = BADGE_STYLE[badge];
              const profitPositive = card.profit > 0;

              return (
                <a
                  key={card.id}
                  href={ebayUrl(card.product_name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group shrink-0 rounded-2xl flex flex-col justify-between transition-all"
                  style={{
                    width: 220,
                    minWidth: 220,
                    padding: '16px',
                    background: 'var(--om-bg-1)',
                    border: '1px solid var(--om-border-0)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = style.border)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--om-border-0)')}
                >
                  {/* Top row — badge + external icon */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded-full"
                      style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
                    >
                      {style.label}
                    </span>
                    <ExternalLink
                      className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity"
                      style={{ color: 'var(--om-text-2)' }}
                    />
                  </div>

                  {/* Card name */}
                  <p
                    className="text-[12px] font-semibold leading-snug line-clamp-2 mb-4"
                    style={{ color: 'var(--om-text-0)' }}
                  >
                    {card.product_name}
                  </p>

                  {/* Profit — hero number */}
                  <div className="mb-3">
                    <p
                      className="text-[28px] font-black tabular-nums leading-none"
                      style={{ color: profitPositive ? 'rgb(0,200,100)' : 'rgb(255,80,80)' }}
                    >
                      {profitPositive ? '+' : ''}${card.profit.toFixed(0)}
                    </p>
                    <p className="text-[9px] mt-0.5 font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--om-text-3)' }}>
                      profit potential
                    </p>
                  </div>

                  {/* Buy → Sell price row */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>Buy</p>
                      <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--om-text-1)' }}>
                        ${card.loose_price.toFixed(0)}
                      </p>
                    </div>
                    <span className="text-[10px] mx-0.5" style={{ color: 'var(--om-text-3)' }}>→</span>
                    <div className="text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--om-text-3)' }}>PSA 10</p>
                      <p className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--om-text-1)' }}>
                        ${card.graded_price.toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {/* Support line */}
                  {supportLine && (
                    <p className="text-[9px] font-medium" style={{ color: style.color, opacity: 0.85 }}>
                      {supportLine}
                    </p>
                  )}
                </a>
              );
            })}
      </div>
    </section>
  );
}
