export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Loading">
      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:0ms]" />
      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
    </span>
  );
}
