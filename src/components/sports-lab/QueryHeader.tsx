import { useMemo } from 'react';
import { RotateCcw, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { QueryHeaderDropdown, TraitsDropdown } from './QueryHeaderDropdown';
import { QuerySummaryBar } from './QuerySummaryBar';
import { SearchModeToggle, type SearchMode } from './SearchModeToggle';
import { QuickSearchInput } from './QuickSearchInput';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Sport, Player, RuleItem } from '@/types/sportsQueryBuilder';

interface QueryHeaderProps {
  sports: Sport[]; players: Player[]; ruleItems: RuleItem[];
  sportKey: string | null; selectedPlayerId: string | null; selectedBrandId: string | null;
  showAllBrands: boolean; selectedTraitIds: string[];
  onSportChange: (key: string | null) => void; onSelectPlayer: (id: string) => void;
  onSelectBrand: (id: string) => void; onSelectShowAll: () => void;
  onToggleTrait: (id: string) => void; onClearTraits?: () => void; onReset: () => void;
  resultCount?: number; isLoading?: boolean;
  searchMode?: SearchMode; onSearchModeChange?: (mode: SearchMode) => void;
  quickSearchQuery?: string; onQuickSearchChange?: (query: string) => void;
}

export function QueryHeader({
  sports, players, ruleItems, sportKey, selectedPlayerId, selectedBrandId, showAllBrands, selectedTraitIds,
  onSportChange, onSelectPlayer, onSelectBrand, onSelectShowAll, onToggleTrait, onClearTraits, onReset,
  resultCount, isLoading,
  searchMode = 'guided', onSearchModeChange, quickSearchQuery = '', onQuickSearchChange,
}: QueryHeaderProps) {
  const isMobile = useIsMobile();
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedSport = sports.find(s => s.key === sportKey);
  const brands = useMemo(() => ruleItems.filter(ri => ri.kind === 'brand'), [ruleItems]);
  const allTraits = useMemo(() => ruleItems.filter(ri => ri.kind === 'trait'), [ruleItems]);
  const traits = useMemo(() => {
    if (showAllBrands || !selectedBrandId) return allTraits;
    return allTraits.filter(t => { const c = t.compatible_brand_ids ?? []; return c.length === 0 || c.includes(selectedBrandId); });
  }, [allTraits, showAllBrands, selectedBrandId]);

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const selectedTraitLabels = traits.filter(t => selectedTraitIds.includes(t.id)).map(t => t.label);
  const playerOptions = useMemo(() => players.map(p => ({ id: p.id, label: p.name, note: p.note || undefined })), [players]);
  const sportOptions = useMemo(() => sports.map(s => ({ id: s.key, label: s.label })), [sports]);
  const brandOptions = useMemo(() => brands.map(b => ({ id: b.id, label: b.label })), [brands]);
  const traitOptions = useMemo(() => traits.map(t => ({ id: t.id, label: t.label })), [traits]);

  const filterControls = (
    <div className="flex items-center gap-1.5 flex-wrap">
      {sports.length > 1 && <QueryHeaderDropdown label="Sport" value={selectedSport?.label || ''} placeholder="Select" options={sportOptions} selectedId={sportKey} onSelect={onSportChange} />}
      {sportKey && <QueryHeaderDropdown label="Player" value={selectedPlayer?.name || ''} placeholder="Select player" options={playerOptions} selectedId={selectedPlayerId} onSelect={onSelectPlayer} searchable />}
      {selectedPlayerId && brands.length > 0 && <QueryHeaderDropdown label="Brand" value={showAllBrands ? 'All Brands' : selectedBrand?.label || ''} placeholder="Select brand" options={brandOptions} selectedId={selectedBrandId} onSelect={onSelectBrand} showAllMode showAllActive={showAllBrands} onShowAll={onSelectShowAll} />}
      {(selectedBrandId || showAllBrands) && traits.length > 0 && <TraitsDropdown traits={traitOptions} selectedIds={selectedTraitIds} onToggle={onToggleTrait} onClear={onClearTraits} />}
      {selectedPlayerId && <Button variant="ghost" size="sm" onClick={onReset} className="om-btn h-9 px-2.5" style={{ color: 'var(--om-text-2)' }}><RotateCcw className="h-3.5 w-3.5" /></Button>}
    </div>
  );

  if (isMobile) {
    return (
      <div className="sticky top-0 z-40">
        <div className="om-command-bar mx-2 mt-2">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold" style={{ color: 'var(--om-text-0)', fontFamily: "'Space Grotesk', sans-serif" }}>Sports Market</h1>
              <div className="flex items-center gap-2 mt-1.5">
                {onSearchModeChange && <SearchModeToggle mode={searchMode} onModeChange={onSearchModeChange} className="scale-90 origin-left" />}
              </div>
              {searchMode === 'quick' && <QuickSearchInput value={quickSearchQuery} onChange={onQuickSearchChange || (() => {})} placeholder="Search any card..." className="mt-2" />}
            </div>
            <div className="flex items-center gap-2">
              <Sheet><SheetTrigger asChild><Button variant="ghost" size="sm" className="om-btn gap-1.5" style={{ color: 'var(--om-text-2)' }}><Filter className="h-3.5 w-3.5" />Filters</Button></SheetTrigger>
                <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl om-surface-1 border-t border-white/10"><SheetHeader><SheetTitle style={{ color: 'var(--om-text-0)' }}>Search Filters</SheetTitle></SheetHeader>
                  <div className="py-4 space-y-4">{filterControls}</div></SheetContent></Sheet>
            </div>
          </div>
        </div>
        <div className="mx-2">
          <QuerySummaryBar playerName={selectedPlayer?.name} sportLabel={selectedSport?.label} brandLabel={selectedBrand?.label} showAllBrands={showAllBrands} traitLabels={selectedTraitLabels} resultCount={resultCount} isLoading={isLoading} idleMessage="Select a sport to begin searching" />
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
                <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--om-text-0)', fontFamily: "'Space Grotesk', sans-serif" }}>Sports Market</h1>
                <p className="text-[11px]" style={{ color: 'var(--om-text-3)' }}>Search by player, brand, and traits</p>
              </div>
              {onSearchModeChange && <SearchModeToggle mode={searchMode} onModeChange={onSearchModeChange} />}
            </div>
            <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end flex-wrap">
              {searchMode === 'quick' ? <QuickSearchInput value={quickSearchQuery} onChange={onQuickSearchChange || (() => {})} className="max-w-lg" /> : filterControls}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
        {searchMode === 'guided' && <QuerySummaryBar playerName={selectedPlayer?.name} sportLabel={selectedSport?.label} brandLabel={selectedBrand?.label} showAllBrands={showAllBrands} traitLabels={selectedTraitLabels} resultCount={resultCount} isLoading={isLoading} idleMessage="Select a sport to begin searching" />}
        {searchMode === 'quick' && quickSearchQuery.trim().length >= 3 && <QuerySummaryBar playerName={quickSearchQuery.trim()} resultCount={resultCount} isLoading={isLoading} idleMessage="Select a sport to begin searching" />}
      </div>
    </div>
  );
}
