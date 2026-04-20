import { Filter } from 'lucide-react';
import { QueryHeaderDropdown } from '@/components/sports-lab/QueryHeaderDropdown';
import { QuerySummaryBar } from '@/components/sports-lab/QuerySummaryBar';
import { CanonicalSetSelector } from '@/components/tcg-lab/CanonicalSetSelector';
import { SearchModeToggle } from '@/components/sports-lab/SearchModeToggle';
import { QuickSearchInput } from '@/components/sports-lab/QuickSearchInput';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTargets } from '@/hooks/useTcgData';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Game, TcgTarget, TcgSet } from '@/types/tcg';

interface TcgHeaderProps {
  selectedGame: Game | null;
  onGameChange: (game: Game) => void;
  selectedTarget: TcgTarget | null;
  onTargetChange: (target: TcgTarget | null) => void;
  sets: TcgSet[];
  selectedSetId: string | null;
  onSetChange: (setId: string | null) => void;
  setSelectorOpen: boolean;
  onSetSelectorOpenChange: (open: boolean) => void;
  mode: 'guided' | 'quick';
  onModeChange: (mode: 'guided' | 'quick') => void;
  quickQuery: string;
  onQuickQueryChange: (query: string) => void;
  totalCount: number;
  isSearchLoading: boolean;
}

const gameOptions = [
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'one_piece', label: 'One Piece' },
];

export function TcgHeader({
  selectedGame, onGameChange, selectedTarget, onTargetChange,
  sets, selectedSetId, onSetChange, setSelectorOpen, onSetSelectorOpenChange,
  mode, onModeChange, quickQuery, onQuickQueryChange, totalCount, isSearchLoading,
}: TcgHeaderProps) {
  const { data: targets = [] } = useTargets(selectedGame);
  const isMobile = useIsMobile();

  const handleTargetChange = (value: string) => {
    const target = targets.find(t => t.id === value);
    onTargetChange(target || null);
  };

  const chaseName = selectedGame === 'one_piece' ? 'Bounty' : 'Chase';
  const selectedSet = sets.find(s => s.id === selectedSetId);
  const hasActiveQuery = (mode === 'guided' && !!selectedTarget && !!selectedGame) || (mode === 'quick' && quickQuery.trim().length > 0);

  const targetOptions = targets.map(t => ({ id: t.id, label: t.name }));

  const summaryPlayerName = mode === 'quick' ? (quickQuery.trim() || undefined) : selectedTarget?.name;
  const summaryBrandLabel = mode === 'guided' && selectedGame !== 'one_piece' ? (selectedSet?.set_name || undefined) : undefined;
  const summaryShowAllBrands = mode === 'guided' && !!selectedTarget && !selectedSetId && selectedGame !== 'one_piece';
  const summaryTraitLabels = mode === 'guided' && hasActiveQuery ? ['Raw Singles'] : [];
  const summaryIdleMessage = !selectedGame ? 'Select a TCG to begin searching' : 'Select a chase to begin searching';

  const guidedFilters = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <QueryHeaderDropdown label="TCG" value={gameOptions.find(g => g.id === selectedGame)?.label || ''} placeholder="Select" options={gameOptions} selectedId={selectedGame} onSelect={(id) => onGameChange(id as Game)} />
      {selectedGame && (
        <QueryHeaderDropdown label={chaseName} value={targets.find(t => t.id === selectedTarget?.id)?.name || ''} placeholder="Select" options={targetOptions} selectedId={selectedTarget?.id || null} onSelect={handleTargetChange} searchable={targets.length > 8} />
      )}
      {selectedGame && selectedGame !== 'one_piece' && selectedTarget && (
        <CanonicalSetSelector sets={sets} selectedSetId={selectedSetId} onSetChange={onSetChange} game={selectedGame} open={setSelectorOpen} onOpenChange={onSetSelectorOpenChange} />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="sticky top-0 z-40">
        <div className="om-command-bar mx-2 mt-2">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold" style={{ color: 'var(--om-text-0)', fontFamily: "'Space Grotesk', sans-serif" }}>TCG Market</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <SearchModeToggle mode={mode} onModeChange={onModeChange} className="scale-90 origin-left" />
              </div>
              {mode === 'quick' && (
                <QuickSearchInput value={quickQuery} onChange={onQuickQueryChange} placeholder="Search any card... (e.g. Charizard VMAX)" className="mt-2" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveQuery && (
                <span className="om-pill om-pill-active tabular-nums text-[10px]">{totalCount}</span>
              )}
              {mode === 'guided' && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="om-btn gap-1.5 text-[var(--om-text-2)] hover:text-[var(--om-text-0)]">
                      <Filter className="h-3.5 w-3.5" />Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl om-surface-1 border-t border-white/10">
                    <SheetHeader><SheetTitle className="text-[var(--om-text-0)]">TCG Filters</SheetTitle></SheetHeader>
                    <div className="py-4 space-y-4">{guidedFilters}</div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </div>
        <div className="mx-2">
          <QuerySummaryBar
            playerName={hasActiveQuery ? summaryPlayerName : undefined}
            brandLabel={summaryBrandLabel} showAllBrands={summaryShowAllBrands}
            traitLabels={summaryTraitLabels}
            resultCount={hasActiveQuery ? totalCount : undefined}
            isLoading={hasActiveQuery ? isSearchLoading : false}
            idleMessage={summaryIdleMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pt-3">
        <div className="om-command-bar px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-4 flex-shrink-0">
              <div>
                <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--om-text-0)', fontFamily: "'Space Grotesk', sans-serif" }}>TCG Market</h1>
                <p className="text-[11px]" style={{ color: 'var(--om-text-3)' }}>Pokémon + One Piece live listings</p>
              </div>
              <SearchModeToggle mode={mode} onModeChange={onModeChange} />
              {hasActiveQuery && (
                <span className="om-pill om-pill-active tabular-nums">{totalCount} cards</span>
              )}
            </div>
            <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end flex-wrap">
              {mode === 'quick' ? (
                <QuickSearchInput value={quickQuery} onChange={onQuickQueryChange} placeholder="Search any card... (e.g. Charizard VMAX)" className="max-w-lg" />
              ) : (
                guidedFilters
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        <QuerySummaryBar
          playerName={hasActiveQuery ? summaryPlayerName : undefined}
          brandLabel={summaryBrandLabel} showAllBrands={summaryShowAllBrands}
          traitLabels={summaryTraitLabels}
          resultCount={hasActiveQuery ? totalCount : undefined}
          isLoading={hasActiveQuery ? isSearchLoading : false}
          idleMessage={summaryIdleMessage}
        />
      </div>
    </div>
  );
}
