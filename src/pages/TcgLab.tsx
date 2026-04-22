import { useState } from 'react';
import { TcgHeader } from '@/components/tcg-lab/TcgHeader';
import { TerminalView } from '@/components/tcg-lab/TerminalView';
import { DiscoveryPanel } from '@/components/tcg-lab/DiscoveryPanel';
import { useSets } from '@/hooks/useTcgData';
import type { Game, TcgTarget } from '@/types/tcg';
import psaMosaic from '@/assets/psa-mosaic.jpg';

export default function TcgLab() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TcgTarget | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [setSelectorOpen, setSetSelectorOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [mode, setMode] = useState<'guided' | 'quick'>('guided');
  const [quickQuery, setQuickQuery] = useState('');

  const { data: sets = [] } = useSets(selectedGame);

  const handleGameChange = (game: Game) => {
    setSelectedGame(game);
    setSelectedTarget(null);
    setSelectedSetId(null);
  };

  const selectedSet = sets.find(s => s.id === selectedSetId);

  return (
    <div className="om-page-bg relative pb-16 sm:pb-0">
      {/* PSA mosaic texture behind header */}
      <div
        className="absolute inset-x-0 top-0 h-[340px] pointer-events-none z-0"
        style={{
          backgroundImage: `url(${psaMosaic})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.06,
          filter: 'blur(20px)',
        }}
      />

      <div className="relative z-10">
        <TcgHeader
          selectedGame={selectedGame}
          onGameChange={handleGameChange}
          selectedTarget={selectedTarget}
          onTargetChange={setSelectedTarget}
          sets={sets}
          selectedSetId={selectedSetId}
          onSetChange={setSelectedSetId}
          setSelectorOpen={setSelectorOpen}
          onSetSelectorOpenChange={setSetSelectorOpen}
          mode={mode}
          onModeChange={setMode}
          quickQuery={quickQuery}
          onQuickQueryChange={setQuickQuery}
          totalCount={totalCount}
          isSearchLoading={isSearchLoading}
        />

        <main className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6">
          {mode === 'quick' && quickQuery.trim() ? (
            <TerminalView
              game={selectedGame ?? 'pokemon'}
              freeQuery={quickQuery.trim()}
              selectedSetId={null}
              sets={[]}
              onTotalCountChange={setTotalCount}
              onLoadingChange={setIsSearchLoading}
            />
          ) : mode === 'guided' && selectedTarget && selectedGame ? (
            <TerminalView
              target={selectedTarget}
              game={selectedGame}
              selectedSetId={selectedSetId}
              sets={sets}
              onTotalCountChange={setTotalCount}
              onLoadingChange={setIsSearchLoading}
            />
          ) : (
            <DiscoveryPanel />
          )}
        </main>
      </div>
    </div>
  );
}
