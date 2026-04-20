import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SortOption } from "@/types/ebay";

interface SearchFiltersProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function SearchFilters({ sort, onSortChange }: SearchFiltersProps) {
  return (
    <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
      <SelectTrigger className="w-[140px] h-7 text-xs bg-secondary/50 border-border/50 rounded-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="best">Best Match</SelectItem>
        <SelectItem value="price_asc">Price: Low-High</SelectItem>
        <SelectItem value="auction_only">Auction</SelectItem>
        <SelectItem value="buy_now_only">Buy It Now</SelectItem>
        <SelectItem value="raw">Ungraded</SelectItem>
      </SelectContent>
    </Select>
  );
}
