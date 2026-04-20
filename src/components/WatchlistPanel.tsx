import { Heart, Trash2, ExternalLink, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WatchlistItem } from "@/types/ebay";

interface WatchlistPanelProps {
  watchlist: WatchlistItem[];
  onRemove: (itemId: string) => void;
  onClear: () => void;
}

export function WatchlistPanel({ watchlist, onRemove, onClear }: WatchlistPanelProps) {
  const formatPrice = (value: string, currency: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Heart className="h-4 w-4 mr-2" />
          Watchlist
          {watchlist.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {watchlist.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Watchlist ({watchlist.length} items)
          </SheetTitle>
        </SheetHeader>

        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <Heart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Your watchlist is empty</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Click the heart icon on any card to add it here
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-180px)] mt-4">
              <div className="space-y-3 pr-4">
                {watchlist.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-sm font-bold text-price mt-1">
                        {formatPrice(item.price.value, item.price.currency)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => onRemove(item.itemId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a
                          href={item.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
