export function SkeletonCard() {
  return (
    <div className="om-card overflow-hidden">
      <div className="aspect-[3/4] om-shimmer" />
      <div className="p-3 space-y-2.5">
        <div className="h-3 w-3/4 rounded om-shimmer" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 rounded om-shimmer" />
          <div className="h-3 w-10 rounded-full om-shimmer" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-12 rounded om-shimmer" />
          <div className="h-2.5 w-14 rounded om-shimmer" />
        </div>
      </div>
    </div>
  );
}
