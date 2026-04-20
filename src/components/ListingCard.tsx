import { ExternalLink, Clock, Gavel, ShoppingCart, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EbayItem } from "@/types/ebay";
import { cn } from "@/lib/utils";
import { useCountdown } from "@/hooks/useCountdown";

interface ListingCardProps {
  item: EbayItem;
  index: number;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (item: EbayItem) => void;
}

function AuctionCountdown({ endDate }: { endDate: string }) {
  const countdown = useCountdown(endDate);

  if (!countdown) return null;

  const { days, hours, minutes, seconds, isEnded, isUrgent, isWarning } = countdown;

  const colorClass = isEnded
    ? "text-muted-foreground"
    : isUrgent
    ? "text-destructive animate-pulse"
    : isWarning
    ? "text-auction"
    : "text-muted-foreground";

  let label: string;
  if (isEnded) {
    label = "Ended";
  } else if (days > 0) {
    label = `${days}d ${hours}h`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    label = `${minutes}m ${seconds}s`;
  } else {
    label = `${seconds}s`;
  }

  return (
    <span className={cn("flex items-center gap-1 font-medium tabular-nums text-[10px]", colorClass)}>
      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
      {label}
    </span>
  );
}

export function ListingCard({ item, index, isInWatchlist, onToggleWatchlist }: ListingCardProps) {
  const formatPrice = (value: string, currency: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  return (
    <div 
      className="group overflow-hidden bg-card border border-border/40 rounded-lg shadow-card hover:shadow-cardHover transition-all duration-200 animate-fadeIn"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Image */}
      <div className="aspect-square relative bg-muted overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No Image
          </div>
        )}
        
        {/* Type badge */}
        <div className="absolute top-2 left-2">
          {item.buyingOption === 'AUCTION' ? (
            <Badge className="bg-auction text-auction-foreground text-[10px] font-semibold shadow-sm px-1.5 py-0.5">
              <Gavel className="h-2.5 w-2.5 mr-0.5" />
              Auction
            </Badge>
          ) : item.buyingOption === 'FIXED_PRICE' ? (
            <Badge className="bg-buyNow text-buyNow-foreground text-[10px] font-semibold shadow-sm px-1.5 py-0.5">
              <ShoppingCart className="h-2.5 w-2.5 mr-0.5" />
              BIN
            </Badge>
          ) : null}
        </div>

        {/* Watchlist heart */}
        {onToggleWatchlist && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWatchlist(item);
            }}
            className={cn(
              "absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200",
              "bg-background/70 backdrop-blur-sm hover:bg-background shadow-sm",
              isInWatchlist && "text-primary"
            )}
            aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Heart 
              className={cn(
                "h-4 w-4 transition-all duration-200",
                isInWatchlist ? "fill-current" : "hover:scale-110"
              )} 
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-medium text-xs line-clamp-2 leading-snug min-h-[2rem]">
          {item.title}
        </h3>

        <div className="space-y-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tabular-nums">
              {formatPrice(item.price.value, item.price.currency)}
            </span>
            {item.buyingOption === 'AUCTION' && (
              <span className="text-[10px] text-muted-foreground">bid</span>
            )}
          </div>
          
          {item.shipping && (
            <p className="text-[10px] text-muted-foreground">
              {parseFloat(item.shipping.value) === 0 
                ? 'Free shipping' 
                : `+${formatPrice(item.shipping.value, item.shipping.currency)} ship`}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="truncate max-w-[60%]">{item.condition}</span>
          {item.endDate && item.buyingOption === 'AUCTION' && (
            <AuctionCountdown endDate={item.endDate} />
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-[11px] group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          asChild
        >
          <a href={item.itemUrl} target="_blank" rel="noopener noreferrer">
            View on eBay
            <ExternalLink className="h-3 w-3 ml-1.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
