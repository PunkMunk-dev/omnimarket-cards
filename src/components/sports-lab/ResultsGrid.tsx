import { useMemo } from 'react';
import { EbayResultsPanel } from './EbayResultsPanel';
import type { EbaySearchParams } from '@/types/sportsEbay';

interface ResultsGridProps {
  playerNames: string[]; brandLabel?: string; traitLabels?: string[]; sportKey?: string | null;
  onResultCountChange?: (count: number) => void; onLoadingChange?: (loading: boolean) => void;
}

export function ResultsGrid({ playerNames, brandLabel, traitLabels = [], sportKey, onResultCountChange, onLoadingChange }: ResultsGridProps) {
  const searchParams: EbaySearchParams = useMemo(() => ({
    playerName: playerNames.join(' '), brand: brandLabel, traits: traitLabels,
  }), [playerNames, brandLabel, traitLabels]);

  return <EbayResultsPanel searchParams={searchParams} traitLabels={traitLabels} sportKey={sportKey} onResultCountChange={onResultCountChange} onLoadingChange={onLoadingChange} />;
}
