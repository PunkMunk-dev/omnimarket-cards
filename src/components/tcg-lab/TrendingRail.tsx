import { TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTargets } from '@/hooks/useTcgData';
import type { TcgTarget, Game } from '@/types/tcg';

interface TrendingRailProps {
  game: Game;
  onSelectTarget: (target: TcgTarget, game: Game) => void;
}

export function TrendingRail({ game, onSelectTarget }: TrendingRailProps) {
  const { data: targets = [], isLoading } = useTargets(game);
  const topTargets = targets.slice(0, 8);
  const sectionTitle = game === 'pokemon' ? 'HOT CHASES' : 'TOP BOUNTIES';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (topTargets.length === 0) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <TrendingUp className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-[0.08em]">{sectionTitle}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5 max-w-[420px]">
        {topTargets.map((target) => (
          <Button
            key={target.id}
            variant="outline"
            size="sm"
            onClick={() => onSelectTarget(target, game)}
            className="h-8 px-3.5 text-xs font-medium border-border/30 bg-secondary/20 hover:bg-secondary/40 hover:border-border/50 rounded-md"
          >
            {target.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
