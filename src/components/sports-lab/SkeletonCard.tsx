import React from 'react';

export const SkeletonCard = React.forwardRef<HTMLDivElement>(
  function SkeletonCard(_props, ref) {
    return (
      <div ref={ref} className="om-card overflow-hidden">
        {/* Image area — matches aspect-square */}
        <div className="aspect-square om-shimmer relative">
          {/* Price overlay placeholder */}
          <div className="absolute bottom-3 left-3 h-5 w-16 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Card body — mirrors EbayListingCard p-3 space-y-2 */}
        <div className="p-3 space-y-2">
          {/* Title: 2 lines with same min-height as real card */}
          <div className="space-y-1.5 min-h-[2.5rem]">
            <div className="h-3.5 w-full rounded om-shimmer" />
            <div className="h-3.5 w-3/4 rounded om-shimmer" />
          </div>

          {/* Profit hero placeholder — matches px-3 py-2 rounded-lg */}
          <div className="h-9 w-full rounded-lg om-shimmer" />

          {/* Utility row — matches pt-1.5 border-top layout */}
          <div className="flex items-center justify-between pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="h-6 w-[52px] rounded-full om-shimmer" />
              <div className="h-6 w-[52px] rounded-full om-shimmer" />
            </div>
            <div className="h-7 w-7 rounded-md om-shimmer" />
          </div>
        </div>
      </div>
    );
  }
);
