import { ExternalLink } from 'lucide-react';
import { HotBadge } from './HotBadge';
import type { TopRoiCard } from '@/hooks/useTopRoi';
import type { ConfidenceLabel } from '@/lib/tcgScoring';

const CONFIDENCE_STYLE: Record<ConfidenceLabel, { color: string; label: string }> = {
  High:   { color: 'rgb(0,200,100)',   label: 'High' },
  Medium: { color: 'rgb(200,160,0)',   label: 'Med' },
  Low:    { color: 'rgb(180,80,80)',   label: 'Low' },
};

interface RoiFeedCardProps {
  card: TopRoiCard;
  rank: number;
}

export function RoiFeedCard({ card, rank }: RoiFeedCardProps) {
  const gradedCompsUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.product_name + ' PSA 10')}&LH_Complete=1&LH_Sold=1&_sacat=183454`;
  const conf = CONFIDENCE_STYLE[card.confidenceLabel];

  return (
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

      {/* Name + metadata row */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--om-text-0)' }}>
          {card.product_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--om-text-3)' }}>
            Raw ${card.loose_price.toFixed(0)} · PSA 10 ${card.graded_price.toFixed(0)} · Gem —
          </span>
          {/* Confidence label */}
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
  );
}
