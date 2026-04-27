import { useRef } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import { HotBadge } from './HotBadge';
import type { TopRoiCard } from '@/hooks/useTopRoi';
import type { ConfidenceLabel } from '@/lib/tcgScoring';
import { psa9FloorLabel, formatSpread } from '@/lib/tcgScoring';
import { useTcgGemRateSearch } from '@/hooks/useTcgGemRateSearch';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

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

const FLOOR_STYLE: Record<'Strong floor' | 'Break-even floor' | 'Weak floor', { color: string }> = {
  'Strong floor':      { color: 'rgb(0,200,100)' },
  'Break-even floor':  { color: 'rgb(200,160,0)' },
  'Weak floor':        { color: 'rgb(180,80,80)' },
};

const SCORE_TOOLTIP =
  'When PSA 9 exists, score weighs ROI, PSA10 spread, PSA9 floor, confidence, and chase demand.';

interface RoiFeedCardProps {
  card: TopRoiCard;
  rank: number;
}

export function RoiFeedCard({ card, rank }: RoiFeedCardProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const gradedCompsUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.product_name + ' PSA 10')}&LH_Complete=1&LH_Sold=1&_sacat=183454`;
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

  // PSA 9 badge cluster — only when grade9_price is present
  const hasPsa9 = card.grade9_price !== null;
  const floorLabel = hasPsa9 ? psa9FloorLabel(card.grade9_price!, card.loose_price) : null;
  const floorStyle = floorLabel ? FLOOR_STYLE[floorLabel] : null;

  // Raw → PSA 9 spread using DB loose_price as purchase reference
  const psa9SpreadDisplay = hasPsa9 && card.psa9Spread !== null
    ? formatSpread(card.psa9Spread)
    : null;

  const psa10SpreadDisplay = formatSpread(card.profit);
  const scoreDisplay = Math.round(card.opportunityScore);

  return (
    <div ref={setRef}>
      <a
        href={gradedCompsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 px-4 py-3 transition-colors"
        style={{ borderBottom: '1px solid var(--om-border-0)' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--om-bg-3)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        {/* Rank */}
        <span className="w-5 text-right text-[11px] tabular-nums shrink-0" style={{ color: 'var(--om-text-3)' }}>
          {rank}
        </span>

        {/* Name + metadata */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--om-text-0)' }}>
            {card.product_name}
          </p>

          {/* Row 1: prices + gem pop + confidence */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--om-text-3)' }}>
              Raw ${card.loose_price.toFixed(0)} · PSA 10 ${card.graded_price.toFixed(0)}{' '}
              {gemLoading ? (
                <>· Gem …</>
              ) : totalGrades !== null && gemConfStyle ? (
                <>
                  · Pop{' '}
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
            {card.hotnessLabel && <HotBadge label={card.hotnessLabel} size="xs" />}
          </div>

          {/* Row 2: PSA 9 badge cluster — only when data available */}
          {hasPsa9 && floorLabel && floorStyle && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Floor label */}
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  color: floorStyle.color,
                  background: `${floorStyle.color}1a`,
                  border: `1px solid ${floorStyle.color}33`,
                }}
              >
                {floorLabel}
              </span>

              {/* Safe flip badge */}
              {card.isSafeFlip && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    color: 'rgb(10,132,255)',
                    background: 'rgba(10,132,255,0.1)',
                    border: '1px solid rgba(10,132,255,0.25)',
                  }}
                >
                  Safe Flip
                </span>
              )}

              {/* Spread cluster */}
              <span className="text-[9px] tabular-nums" style={{ color: 'var(--om-text-3)' }}>
                PSA9{' '}
                <span style={{ color: (card.psa9Spread ?? 0) >= 0 ? 'rgb(0,200,100)' : 'rgb(180,80,80)' }}>
                  {psa9SpreadDisplay}
                </span>
                {' · '}PSA10{' '}
                <span style={{ color: 'rgb(0,200,100)' }}>
                  {psa10SpreadDisplay}
                </span>
              </span>

              {/* Opportunity score with tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] tabular-nums cursor-default"
                    style={{ color: 'var(--om-text-3)' }}
                  >
                    Score {scoreDisplay}
                    <Info className="h-2.5 w-2.5 opacity-40" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[220px] text-[11px] leading-snug"
                  style={{ background: 'var(--om-bg-1)', border: '1px solid var(--om-border-0)', color: 'var(--om-text-1)' }}
                >
                  {SCORE_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Profit + ROI */}
        <div className="text-right shrink-0">
          <p className="text-[13px] font-bold tabular-nums" style={{ color: 'rgb(0,200,100)' }}>
            +${card.profit.toFixed(0)}
          </p>
          <p className="text-[10px] tabular-nums" style={{ color: 'var(--om-text-2)' }}>
            {card.roi.toFixed(0)}% ROI
          </p>
        </div>

        <ExternalLink
          className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
          style={{ color: 'var(--om-text-2)' }}
        />
      </a>
    </div>
  );
}
