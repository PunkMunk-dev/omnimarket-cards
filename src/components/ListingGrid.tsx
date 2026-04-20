import { ListingCard } from "./ListingCard";
import type { EbayItem } from "@/types/ebay";

interface ListingGridProps {
  items: EbayItem[];
  isInWatchlist?: (itemId: string) => boolean;
  onToggleWatchlist?: (item: EbayItem) => void;
}

export function ListingGrid({
  items,
  isInWatchlist,
  onToggleWatchlist,
}: ListingGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item, index) => (
        <ListingCard 
          key={item.itemId} 
          item={item} 
          index={index} 
          isInWatchlist={isInWatchlist?.(item.itemId)} 
          onToggleWatchlist={onToggleWatchlist}
        />
      ))}
    </div>
  );
}
