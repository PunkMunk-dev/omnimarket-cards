import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SearchFilters } from '@/types/tcg';

export type PriceRange = 'all' | '10-50' | '50-100' | '100-250' | '250-500' | '500+';

// PRICE_RANGES is tightly coupled to this toolbar — co-locating intentionally.
// eslint-disable-next-line react-refresh/only-export-components
export const PRICE_RANGES: { value: PriceRange; label: string; min: number; max: number }[] = [
  { value: 'all', label: '$10+', min: 10, max: 0 },
  { value: '10-50', label: '$10–$50', min: 10, max: 50 },
  { value: '50-100', label: '$50–$100', min: 50, max: 100 },
  { value: '100-250', label: '$100–$250', min: 100, max: 250 },
  { value: '250-500', label: '$250–$500', min: 250, max: 500 },
  { value: '500+', label: '$500+', min: 500, max: 0 },
];

interface ResultsToolbarProps {
  resultCount: number;
  totalCount: number;
  showAuctionsOnly: boolean;
  onToggleAuctions: () => void;
  priceRange: PriceRange;
  onPriceRangeChange: (range: PriceRange) => void;
  sortOption: SearchFilters['sort'];
  onSortChange: (option: SearchFilters['sort']) => void;
  filteredOutCount?: number;
}

export function ResultsToolbar({
  resultCount, totalCount, showAuctionsOnly, onToggleAuctions,
  priceRange, onPriceRangeChange, sortOption, onSortChange, filteredOutCount,
}: ResultsToolbarProps) {
  return (
    <div className="om-toolbar px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono">
          <span className="font-semibold tabular-nums" style={{ color: 'var(--om-text-0)' }}>{resultCount}</span>
          {totalCount !== resultCount && (
            <span style={{ color: 'var(--om-text-2)' }}>/ {totalCount}</span>
          )}
          <span style={{ color: 'var(--om-text-3)' }}>cards</span>
        </span>
        {!!filteredOutCount && filteredOutCount > 0 && (
          <span className="text-[10px] font-mono" style={{ color: 'var(--om-text-3)' }}>{filteredOutCount} filtered</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onToggleAuctions}
          className={cn(
            'om-btn om-pill',
            showAuctionsOnly && 'om-pill-active'
          )}
        >
          Auctions
        </button>

        <Select value={priceRange} onValueChange={(v) => onPriceRangeChange(v as PriceRange)}>
          <SelectTrigger className="h-7 w-[110px] text-[11px] om-input rounded-full border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="om-dropdown">
            {PRICE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value} className="text-xs text-[var(--om-text-1)] hover:bg-white/5">
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3 w-3" style={{ color: 'var(--om-text-3)' }} />
          <Select value={sortOption} onValueChange={(v) => onSortChange(v as SearchFilters['sort'])}>
            <SelectTrigger className="h-7 w-[120px] text-[11px] om-input rounded-full border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="om-dropdown">
              {showAuctionsOnly && <SelectItem value="ending_soonest" className="text-xs text-[var(--om-text-1)]">Ending Soonest</SelectItem>}
              <SelectItem value="newly_listed" className="text-xs text-[var(--om-text-1)]">Newest</SelectItem>
              <SelectItem value="best_match" className="text-xs text-[var(--om-text-1)]">Best Match</SelectItem>
              <SelectItem value="price_low" className="text-xs text-[var(--om-text-1)]">Low to High</SelectItem>
              <SelectItem value="price_high" className="text-xs text-[var(--om-text-1)]">High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
