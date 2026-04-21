import { Search, TrendingUp, BarChart3, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    label: 'Search any card',
    desc: 'Pokémon, One Piece, Sports — guided or quick search',
  },
  {
    icon: TrendingUp,
    label: 'See live eBay listings',
    desc: 'Raw cards, filtered and ranked instantly',
  },
  {
    icon: BarChart3,
    label: 'Spot the spread',
    desc: 'PSA-10 upside calculated on every result',
  },
];

const EXAMPLE_SEARCHES = [
  'Monkey D. Luffy Manga Alt Art',
  'Mega Charizard X ex',
  'Luffy One Piece Card',
  'Pikachu Illustrator',
  'Charizard PSA 10',
];

interface GuidedSearchEmptyStateProps {
  onQuickSearch?: (query: string) => void;
}

export function GuidedSearchEmptyState({ onQuickSearch }: GuidedSearchEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">

      {/* 3-step guide */}
      <div className="flex items-start justify-center flex-wrap gap-2 sm:gap-0">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-2 sm:gap-0">
            <div className="flex flex-col items-center gap-2.5 w-[140px] sm:w-[160px]">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)' }}
              >
                <step.icon className="w-5 h-5" style={{ color: 'var(--om-accent)' }} />
              </div>
              <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--om-text-1)' }}>
                {step.label}
              </p>
              <p className="text-[11px] leading-snug" style={{ color: 'var(--om-text-3)' }}>
                {step.desc}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight
                className="w-4 h-4 mt-4 shrink-0 hidden sm:block"
                style={{ color: 'var(--om-border-1)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Example search pills */}
      {onQuickSearch && (
        <div className="mt-10 space-y-3">
          <p className="text-[11px] font-medium" style={{ color: 'var(--om-text-3)' }}>
            Try an example
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
            {EXAMPLE_SEARCHES.map((q) => (
              <button
                key={q}
                onClick={() => onQuickSearch(q)}
                className="om-btn om-pill"
                style={{ color: 'var(--om-text-1)' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
