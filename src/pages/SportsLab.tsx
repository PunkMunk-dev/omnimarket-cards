import { useMemo, useState, useCallback, useEffect } from 'react';
import type { EbayListing } from '@/types/sportsEbay';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/sports-lab/SkeletonCard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QueryHeader } from '@/components/sports-lab/QueryHeader';
import { ResultsGrid } from '@/components/sports-lab/ResultsGrid';
import { WatchlistPanel } from '@/components/sports-lab/WatchlistPanel';
import { EbayResultsPanel } from '@/components/sports-lab/EbayResultsPanel';
import { FeaturedOpportunity } from '@/components/sports-lab/FeaturedOpportunity';
import { GuidedSearchEmptyState } from '@/components/shared/GuidedSearchEmptyState';
import { useSportsRulesetSnapshot } from '@/hooks/useSportsRulesetSnapshot';
import { useSportsQueryBuilderState } from '@/hooks/useSportsQueryBuilderState';
import { useSportsWatchlist } from '@/contexts/SportsWatchlistContext';
import type { SearchMode } from '@/components/sports-lab/SearchModeToggle';

export default function SportsLab() {
  const { data: snapshot, isLoading, error } = useSportsRulesetSnapshot();
  const [resultCount, setResultCount] = useState<number | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { count: watchlistCount } = useSportsWatchlist();
  const [searchMode, setSearchMode] = useState<SearchMode>('guided');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [featuredListing, setFeaturedListing] = useState<EbayListing | null>(null);

  const quickSearchParams = useMemo(() => ({
    playerName: quickSearchQuery.trim(),
    freeFormSearch: true as const,
  }), [quickSearchQuery]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { state, setSportKey, selectPlayer, selectBrand, setShowAllBrands, toggleTrait, clearTraits, reset } = useSportsQueryBuilderState(snapshot?.rule_items ?? []);

  const filteredPlayers = useMemo(() => snapshot?.players.filter(p => p.sport_key === state.sport_key) ?? [], [snapshot?.players, state.sport_key]);
  const filteredRuleItems = useMemo(() => snapshot?.rule_items.filter(ri => ri.sport_key === state.sport_key) ?? [], [snapshot?.rule_items, state.sport_key]);
  const selectedPlayerNames = useMemo(() => filteredPlayers.filter(p => state.selected_player_ids.includes(p.id)).map(p => p.name), [filteredPlayers, state.selected_player_ids]);
  const selectedBrand = filteredRuleItems.find(ri => ri.kind === 'brand' && state.selected_rule_item_ids.includes(ri.id));
  const selectedTraitIds = state.selected_rule_item_ids.filter(id => { const item = filteredRuleItems.find(ri => ri.id === id); return item && item.kind === 'trait'; });
  const selectedTraitLabels = useMemo(() => filteredRuleItems.filter(ri => ri.kind === 'trait' && state.selected_rule_item_ids.includes(ri.id)).map(ri => ri.label), [filteredRuleItems, state.selected_rule_item_ids]);

  const hasPlayer = state.selected_player_ids.length > 0;
  const hasBrandOrShowAll = !!selectedBrand || state.show_all_brands;
  const canSearchGuided = hasPlayer && hasBrandOrShowAll;
  const canSearchQuick = quickSearchQuery.trim().length >= 3;

  const handleResultCountChange = useCallback((count: number) => setResultCount(count), []);
  const handleLoadingChange = useCallback((loading: boolean) => setIsSearching(loading), []);
  const handleSearchModeChange = useCallback((mode: SearchMode) => { setSearchMode(mode); setResultCount(undefined); }, []);
  const handleExampleSearch = useCallback((query: string) => {
    setSearchMode('quick');
    setQuickSearchQuery(query);
  }, []);

  if (isLoading) return (
    <div className="om-page-bg">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 pt-4">
        <div className="om-command-bar px-5 py-4"><Skeleton className="h-8 w-48 om-shimmer" /></div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="om-page-bg flex items-center justify-center p-4">
      <div className="om-card max-w-md w-full p-6">
        <p className="text-center" style={{ color: 'var(--om-danger)' }}>Failed to load ruleset. Please try again later.</p>
      </div>
    </div>
  );

  if (!snapshot?.ruleset) return (
    <div className="om-page-bg flex items-center justify-center p-4">
      <div className="om-card max-w-md w-full p-6 text-center space-y-4">
        <p style={{ color: 'var(--om-text-2)' }}>No published ruleset available yet. An admin needs to create and publish a ruleset first.</p>
      </div>
    </div>
  );

  return (
    <div className="om-page-bg flex flex-col pb-16 sm:pb-0">
      <QueryHeader
        sports={snapshot.sports} players={filteredPlayers} ruleItems={filteredRuleItems}
        sportKey={state.sport_key} selectedPlayerId={state.selected_player_ids[0] ?? null}
        selectedBrandId={selectedBrand?.id ?? null} showAllBrands={state.show_all_brands} selectedTraitIds={selectedTraitIds}
        onSportChange={setSportKey} onSelectPlayer={selectPlayer} onSelectBrand={selectBrand}
        onSelectShowAll={() => setShowAllBrands(true)} onToggleTrait={toggleTrait} onClearTraits={clearTraits} onReset={reset}
        resultCount={(searchMode === 'guided' ? canSearchGuided : canSearchQuick) ? resultCount : undefined}
        isLoading={isSearching}
        searchMode={searchMode} onSearchModeChange={handleSearchModeChange}
        quickSearchQuery={quickSearchQuery} onQuickSearchChange={setQuickSearchQuery}
      />
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 md:px-6 lg:px-8 py-6">
        <FeaturedOpportunity topListing={featuredListing} onExampleSearch={handleExampleSearch} />
        {searchMode === 'quick' ? (
          !canSearchQuick ? (
            <GuidedSearchEmptyState onQuickSearch={handleExampleSearch} />
          ) : <EbayResultsPanel searchParams={quickSearchParams} sportKey={state.sport_key} onResultCountChange={handleResultCountChange} onLoadingChange={handleLoadingChange} onTopListingChange={setFeaturedListing} />
        ) : (
          !canSearchGuided ? (
            <GuidedSearchEmptyState onQuickSearch={handleExampleSearch} />
          ) : <ResultsGrid playerNames={selectedPlayerNames} brandLabel={state.show_all_brands ? undefined : selectedBrand?.label} traitLabels={selectedTraitLabels} sportKey={state.sport_key} onResultCountChange={handleResultCountChange} onLoadingChange={handleLoadingChange} />
        )}
      </main>
      <Sheet open={watchlistOpen} onOpenChange={setWatchlistOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 om-surface-1" style={{ borderLeft: '1px solid var(--om-border-0)' }}>
          <SheetHeader className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--om-divider)' }}>
            <SheetTitle style={{ color: 'var(--om-text-0)' }}>Watchlist</SheetTitle>
          </SheetHeader>
          <WatchlistPanel />
        </SheetContent>
      </Sheet>
      <Button variant="outline" size="icon"
        className={cn("fixed bottom-6 right-6 z-50 rounded-full shadow-md transition-opacity duration-300 om-btn", showScrollTop ? "opacity-100" : "opacity-0 pointer-events-none")}
        style={{ background: 'var(--om-bg-2)', color: 'var(--om-text-1)' }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ChevronUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
