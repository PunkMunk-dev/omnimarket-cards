import { Star, Trash2, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSportsWatchlist } from '@/contexts/SportsWatchlistContext';

export function WatchlistPanel() {
  const { watchlist, removeFromWatchlist, clearWatchlist, count } = useSportsWatchlist();

  const formatPrice = (value: string, currency: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
  };

  if (count === 0) return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><Star className="h-8 w-8 text-muted-foreground/50" /></div>
      <h2 className="text-lg font-bold mb-2">No Cards Saved</h2>
      <p className="text-sm text-muted-foreground/70">Click the star icon on any card to add it to your watchlist.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <p className="text-sm text-muted-foreground">{count} card{count !== 1 ? 's' : ''} saved</p>
        <Button variant="ghost" size="sm" onClick={clearWatchlist} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4 mr-1.5" />Clear All
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {watchlist.map(item => (
            <div key={item.itemId} className="flex gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</h4>
                <p className="text-sm font-bold text-price mt-1">{formatPrice(item.price.value, item.price.currency)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => removeFromWatchlist(item.itemId)}>
                  <X className="h-4 w-4" />
                </Button>
                {item.itemUrl && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={item.itemUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
