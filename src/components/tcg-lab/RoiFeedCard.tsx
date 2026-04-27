import { useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { HotBadge } from './HotBadge';
import type { TopRoiCard } from '@/hooks/useTopRoi';
import type { ConfidenceLabel } from '@/lib/tcgScoring';
import { useTcgGemRateSearch } from '@/hooks/useTcgGemRateSearch';
import type { Game } from '@/types/tcg';

const CONFIDENCE_STYLE: Record<ConfidenceLabel, { color: string; label: string }> = {
  High:   { color: 'rgb(0,200,100)',   label: 'High' },
  Medium: { color: 'rgb(200,160,0)',   label: 'Med' },
  Low:    { color: 'rgb(180,80,80)',   label: 'Low' },
};

const GEM_CONF_STYLE = {
  high:   { color: 'rgb(0,200,100)',  label: 'High' },
  medium: { color: 'rgb(200,160,0)', label: 'Med'  },
  low:    { color: 'rgb(180,80,80)', label: 'Low'  },
} as const;

interface RoiFeedCardProps {
  card: TopRoiCard;
  rank: number;
  onFindListings?: (query: string, game: Game) => void;
}

export function RoiFeedCard({ card, rank, onFindListings }: RoiFeedCardProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const gradedCompsUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.product_name + ' PSA 10')}&LH_Complete=1&LH_Sold=1&_sacat=183454`;
  const cardGame: Game = card.category === 'onepiece' ? 'one_piece' : 'pokemon';
  const conf = CONFIDENCE_STYLE[card.confidenceLabel];

  const gemCategory = card.category === 'onepiece' ? 'one_piece' : 'pokemon';
  const { containerRef: gemRef, totalGrades, confidence: gemConfidence, loading: gemLoading } = useTcgGemRateSearch({
    product_name: card.product_name,
    normalized_name: card.normalized_name,
    category: gemCategory,
  });

  const setRef = (el: HTMLDivElement | null) => {
    (rowRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    (gemRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const gemConfStyle = gemConfidence ? GEM_CONF_STYLE[gemConfidence] : null;

  return (
    <div ref={setRef} className="group" style={{ borderBottom: '1px solid var(--om-border-0)' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Rank */}
        <span className="w-5 text-right text-[11px] tabular-nums shrink-0" style={{ color: 'var(--om-text-3)' }}>
          {rank}
        </span>

        {/* Name + metadata */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--om-text-0)' }}>
            {card.product_name}
          </p>

          {/* Price anchors + gem pop */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--om-text-3)' }}>
              Raw ${card.loose_price.toFixed(0)} · PSA 10 ${card.graded_price.toFixed(0)}
              {card.grade9_price != null && (
                <> · PSA 9 ${card.grade9_price.toFixed(0)}</>
              )}
              {gemLoading ? (
                <> · Pop …</>
              ) : totalGrades !== null && gemConfStyle ? (
                <>
                  {' · Pop '}
                  <span style={{ color: 'var(--om-text-2)' }}>{totalGrades.toLocaleString()}</span>
                  {' '}
                  <span
                    className="text-[9px] font-semibold px-1 py-0.5 rounded"
                    style={{ color: gemConfStyle.color, background: `${gemConfStyle.color}1a` }}
                  >
                    {gemConfStyle.label}
                  </span>
                </>
              ) : null}
            </span>
          </div>

          {/* Badge row — only meaningful badges */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                color: conf.color,
                background: `${conf.color}1a`,
                border: `1px solid ${conf.color}33`,
              }}
            >
              {conf.label} Conf
            </span>

            {card.isSafeFlip && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  color: 'rgb(10,132,255)',
                  background: 'rgba(10,132,255,0.10)',
                  border: '1px solid rgba(10,132,255,0.25)',
                }}
              >
                Safe floor
              </span>
            )}

            {card.hotnessLabel && <HotBadge label={card.hotnessLabel} size="xs" />}
          </div>
        </div>

        {/* Spread — right side */}
        <div className="text-right shrink-0">
          <p className="text-[13px] font-bold tabular-nums" style={{ color: 'rgb(0,200,100)' }}>
            +${card.profit.toFixed(0)}
          </p>
          <p className="text-[9px]" style={{ color: 'var(--om-text-3)' }}>
            spread
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onFindListings && (
            <button
              onClick={() => onFindListings(card.product_name, cardGame)}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-all whitespace-nowrap"
              style={{
                background: 'rgba(10,132,255,0.10)',
                color: 'rgb(10,132,255)',
                border: '1px solid rgba(10,132,255,0.20)',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(10,132,255,0.18)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(10,132,255,0.10)')}
            >
              Find Live Listings
            </button>
          )}
          <a
            href={gradedCompsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-40 transition-opacity"
            title="View PSA 10 sold comps on eBay"
          >
            <ExternalLink className="h-3 w-3" style={{ color: 'var(--om-text-2)' }} />
          </a>
        </div>
      </div>
    </div>
  );
}
