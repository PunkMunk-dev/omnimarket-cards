import { LoadingDots } from './LoadingDots';
import type { Game } from '@/types/tcg';

interface ContextBarProps {
  targetName: string;
  setName: string | null;
  totalCount: number;
  isLoading: boolean;
  game: Game | null;
}

export function ContextBar({ targetName, setName, totalCount, isLoading, game }: ContextBarProps) {
  return (
    <div className="w-full border-b border-border/20 bg-secondary/10">
      <div className="container flex items-center justify-between h-8 px-4">
        <span className="text-xs text-muted-foreground">
          Showing: <span className="text-foreground">{targetName}</span>
          {game !== 'one_piece' && (
            <>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className="text-foreground">{setName ?? 'All Sets'}</span>
            </>
          )}
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="text-foreground">Raw Singles</span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {isLoading ? <LoadingDots /> : <>{totalCount} cards</>}
        </span>
      </div>
    </div>
  );
}
