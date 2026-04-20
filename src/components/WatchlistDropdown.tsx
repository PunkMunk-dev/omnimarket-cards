import { Star, X, ExternalLink, Search, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSharedWatchlist } from '@/contexts/WatchlistContext';
import { extractSearchQuery } from '@/lib/cleanTitle';
import type { WatchlistItem } from '@/types/ebay';

interface WatchlistDropdownProps {
  onSearchItem: (title: string) => void;
}

export function WatchlistDropdown({ onSearchItem }: WatchlistDropdownProps) {
  const { watchlist, removeFromWatchlist, clearWatchlist, count } = useSharedWatchlist();

  if (count === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-11 w-11 shrink-0">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
            {count > 99 ? '99+' : count}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 bg-popover border-border z-50">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Starred Cards ({count})</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={clearWatchlist}>
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
        <ScrollArea className="max-h-[28rem]">
          <div className="divide-y divide-border">
            {watchlist.map((item: WatchlistItem) => (
              <div key={item.itemId} className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-20 h-20 rounded object-contain shrink-0 bg-muted"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">${item.price.value}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Search this card"
                    onClick={() => onSearchItem(extractSearchQuery(item.title))}
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                  {item.itemUrl && (
                    <a href={item.itemUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent transition-colors">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    title="Remove"
                    onClick={() => removeFromWatchlist(item.itemId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
