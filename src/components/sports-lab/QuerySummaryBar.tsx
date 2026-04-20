import { cn } from '@/lib/utils';

interface QuerySummaryBarProps {
  playerName?: string; sportLabel?: string; brandLabel?: string; showAllBrands?: boolean;
  traitLabels?: string[]; resultCount?: number; isLoading?: boolean;
  idleMessage?: string;
}

export function QuerySummaryBar({ playerName, sportLabel, brandLabel, showAllBrands, traitLabels = [], resultCount, isLoading, idleMessage = 'Select a player to begin searching' }: QuerySummaryBarProps) {
  if (!playerName) return (
    <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs" style={{ color: 'var(--om-text-3)' }}>{idleMessage}</p>
    </div>
  );

  const parts: string[] = [];
  if (playerName) parts.push(playerName);
  if (showAllBrands) parts.push('All Brands');
  else if (brandLabel) parts.push(brandLabel);
  if (traitLabels.length > 0) parts.push(...traitLabels);
  parts.push('Raw Only');

  const hasQuery = !!playerName && (!!brandLabel || showAllBrands);

  return (
    <div className="h-8 px-4 flex items-center" style={{ background: 'rgba(14,20,32,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between gap-4 text-xs w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span style={{ color: 'var(--om-text-3)' }}>Showing:</span>
          <span className="truncate" style={{ color: 'var(--om-text-0)' }}>
            {parts.map((part, i) => (<span key={i}>{i > 0 && <span className="mx-1.5" style={{ color: 'var(--om-text-3)' }}>·</span>}{part}</span>))}
          </span>
        </div>
        {hasQuery && (
          <div className="flex-shrink-0">
            {isLoading ? <span className="animate-pulse" style={{ color: 'var(--om-text-2)' }}>Searching...</span> :
              resultCount !== undefined ? <span className="om-pill om-pill-active tabular-nums">{resultCount} cards</span> :
              <span style={{ color: 'var(--om-text-2)' }}>Ready</span>}
          </div>
        )}
      </div>
    </div>
  );
}
