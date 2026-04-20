import { Search } from "lucide-react";

interface EmptyStateProps {
  query?: string;
}

export function EmptyState({ query }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No results found</h3>
      {query ? (
        <p className="text-muted-foreground max-w-md">
          We couldn't find any listings for "<span className="font-medium">{query}</span>". 
          Try adjusting your search or filters.
        </p>
      ) : (
        <p className="text-muted-foreground max-w-md">
          Enter a card name to start searching eBay listings.
        </p>
      )}
    </div>
  );
}
