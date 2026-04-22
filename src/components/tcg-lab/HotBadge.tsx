import { cn } from '@/lib/utils';
import type { HotnessLabel } from '@/hooks/useTopRoi';

const STYLES: Record<HotnessLabel, { bg: string; color: string; dot: string }> = {
  'Heating Up':           { bg: 'rgba(255,100,40,0.12)', color: 'rgb(255,130,70)',  dot: 'rgb(255,100,40)' },
  'Spread Widening':      { bg: 'rgba(0,200,100,0.10)',  color: 'rgb(0,200,100)',   dot: 'rgb(0,200,100)' },
  'High Upside':          { bg: 'rgba(10,132,255,0.12)', color: 'rgb(10,132,255)',  dot: 'rgb(10,132,255)' },
  'New Release Momentum': { bg: 'rgba(180,80,255,0.12)', color: 'rgb(190,100,255)', dot: 'rgb(180,80,255)' },
};

interface HotBadgeProps {
  label: HotnessLabel;
  size?: 'xs' | 'sm';
  className?: string;
}

export function HotBadge({ label, size = 'sm', className }: HotBadgeProps) {
  const s = STYLES[label];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
        size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className
      )}
      style={{ background: s.bg, color: s.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full animate-pulse inline-block" style={{ background: s.dot }} />
      {label}
    </span>
  );
}
