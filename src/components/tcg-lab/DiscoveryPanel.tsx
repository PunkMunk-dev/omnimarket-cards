import { useState } from 'react';
import { TrendingUp, DollarSign, Shield, Zap, Flame } from 'lucide-react';
import { useTopRoi, getHotnessLabel, getRoiBucket } from '@/hooks/useTopRoi';
import type { RoiBucket } from '@/hooks/useTopRoi';
import { RoiFeedCard } from './RoiFeedCard';
import { HotBadge } from './HotBadge';
import type { Game } from '@/types/tcg';

const GAME_TABS: { key: Game; label: string }[] = [
  { key: 'pokemon',   label: 'Pokémon' },
  { key: 'one_piece', label: 'One Piece' },
];

const BUCKET_TABS: { key: RoiBucket; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'Best ROI',    label: 'Best ROI',    Icon: TrendingUp },
  { key: 'Best Spread', label: 'Best Spread', Icon: DollarSign },
  { key: 'Low Risk',    label: 'Low Risk',    Icon: Shield },
  { key: 'Emerging',    label: 'Emerging',    Icon: Zap },
];

export function DiscoveryPanel() {
  const [game, setGame] = useState<Game>('pokemon');
  const [bucket, setBucket] = useState<RoiBucket>('Best ROI');

  const { data: allCards = [], isLoading } = useTopRoi(game);

  const withHotness = allCards.map(c => ({ ...c, hotness: getHotnessLabel(c) }));

  // Hot cards: any card with a hotness label, deduplicated, up to 6
  const hotCards = withHotness.filter(c => c.hotness !== null).slice(0, 6);

  // Bucket cards: filtered + limited to 25
  const bucketCards = withHotness.filter(c => getRoiBucket(c) === bucket).slice(0, 25);

  return (
    <div className="space-y-8 max-w-[900px]">

      {/* Game selector */}
      <div className="flex items-center gap-2">
        {GAME_TABS.map(g => (
          <button
            key={g.key}
            onClick={() => setGame(g.key)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background: game === g.key ? 'var(--om-accent)' : 'var(--om-bg-2)',
              color: game === g.key ? '#fff' : 'var(--om-text-2)',
              border: game === g.key ? '1px solid transparent' : '1px solid var(--om-border-0)',
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Hot Right Now */}
      {(isLoading || hotCards.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-3.5 w-3.5" style={{ color: 'rgb(255,130,70)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--om-text-2)' }}>
              Hot Right Now
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl px-3 py-2.5 animate-pulse"
                  style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)', height: '72px' }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {hotCards.map(card => (
                <a
                  key={card.id}
                  href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.product_name + ' PSA 10')}&LH_Complete=1&LH_Sold=1&_sacat=183454`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl px-3 py-2.5 transition-colors hover:border-[var(--om-border-1)]"
                  style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)', display: 'block' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium truncate min-w-0" style={{ color: 'var(--om-text-0)' }}>
                      {card.product_name}
                    </p>
                    <HotBadge label={card.hotness!} size="xs" />
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--om-text-3)' }}>
                    Raw ${card.loose_price.toFixed(0)} · PSA 10 ${card.graded_price.toFixed(0)}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-[15px] font-bold tabular-nums" style={{ color: 'rgb(0,200,100)' }}>
                      +${card.profit.toFixed(0)}
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--om-text-2)' }}>
                      {card.roi.toFixed(0)}% ROI
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Top 100 ROI */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--om-accent)' }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--om-text-2)' }}>
            Top 100 ROI
          </span>
          {!isLoading && allCards.length > 0 && (
            <span className="text-[10px] ml-auto" style={{ color: 'var(--om-text-3)' }}>
              {allCards.length} cards ranked · $25 grading cost included
            </span>
          )}
        </div>

        {/* Bucket tabs */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-0.5">
          {BUCKET_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setBucket(key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0"
              style={{
                background: bucket === key ? 'rgba(10,132,255,0.12)' : 'var(--om-bg-2)',
                color: bucket === key ? 'rgb(10,132,255)' : 'var(--om-text-2)',
                border: bucket === key ? '1px solid rgba(10,132,255,0.25)' : '1px solid var(--om-border-0)',
              }}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Card list */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--om-bg-1)', border: '1px solid var(--om-border-0)' }}>
          {isLoading ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--om-text-3)' }} />
              <span className="text-[11px]" style={{ color: 'var(--om-text-3)' }}>Loading ROI data…</span>
            </div>
          ) : bucketCards.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[12px]" style={{ color: 'var(--om-text-3)' }}>No cards in this bucket</p>
            </div>
          ) : (
            <div>
              {bucketCards.map((card, i) => (
                <RoiFeedCard key={card.id} card={card} hotness={card.hotness} rank={i + 1} />
              ))}
              {/* Remove border on last item */}
              <style>{`div > a:last-child { border-bottom: none !important; }`}</style>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
