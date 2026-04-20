import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultsHeaderProps {
  query: string;
  total: number;
  showing: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function ResultsHeader({ 
  total, 
  hasMore, 
  isLoadingMore, 
  onLoadMore 
}: ResultsHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground tabular-nums">
        <span className="font-semibold text-foreground">{total.toLocaleString()}</span> listings
      </span>
      
      {hasMore && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] px-2 text-primary hover:text-primary"
          onClick={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Loading…
            </>
          ) : (
            "Load more"
          )}
        </Button>
      )}
    </div>
  );
}
