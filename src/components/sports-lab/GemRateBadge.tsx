import { useState, useEffect, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSportsGemRate } from '@/hooks/useSportsGemRate';
import type { EbayListing } from '@/types/sportsEbay';

interface GemRateBadgeProps { searchContext: EbayListing['searchContext']; fallbackUrl: string; }

export function GemRateBadge({ searchContext, fallbackUrl }: GemRateBadgeProps) {
  const containerRef = useRef<HTMLAnchorElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || hasFetched) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); setHasFetched(true); observer.disconnect(); }
    }, { threshold: 0.1, rootMargin: '100px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasFetched]);

  const { gemRate, psa10Pop, totalPsaPop, psa10Url, isLoading } = useSportsGemRate(searchContext, isVisible);
  const hasGemRate = gemRate !== null;
  const displayUrl = hasGemRate && psa10Url ? psa10Url : fallbackUrl;
  const displayText = isLoading ? 'Gem...' : hasGemRate ? `Gem: ${gemRate}%` : 'Gem';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a ref={containerRef} href={displayUrl} target="_blank" rel="noopener noreferrer"
            className={`min-w-[52px] text-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors ${isLoading ? 'bg-blue-500/50 text-white/70 cursor-wait' : 'bg-blue-500/80 text-white hover:bg-blue-500'}`}
            onClick={(e) => isLoading && e.preventDefault()}>
            {displayText}
          </a>
        </TooltipTrigger>
        {hasGemRate && (
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            <div className="space-y-1">
              {psa10Pop !== null && <p>PSA 10 Pop: <span className="font-semibold">{psa10Pop.toLocaleString()}</span></p>}
              {totalPsaPop !== null && <p>Total Pop: <span className="font-semibold">{totalPsaPop.toLocaleString()}</span></p>}
              <p>Gem Rate: <span className="font-semibold text-blue-400">{gemRate}%</span></p>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
