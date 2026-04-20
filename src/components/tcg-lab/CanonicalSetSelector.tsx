import { Layers } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TcgSet, Game } from '@/types/tcg';

interface CanonicalSetSelectorProps {
  sets: TcgSet[];
  selectedSetId: string | null;
  onSetChange: (setId: string | null) => void;
  game: Game;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const POKEMON_SET_PRIORITY = [
  'Base Set Shadowless', 'Base Set', 'EX Unseen Forces', 'EX Dragon Frontiers',
  'Evolving Skies', 'Crown Zenith', 'Scarlet & Violet 151', 'Prismatic Evolutions',
  'Surging Sparks', 'Stellar Crown', 'Brilliant Stars', 'Shrouded Fable',
  'Twilight Masquerade', 'Paldean Fates', 'Silver Tempest', 'Temporal Forces',
];

export function CanonicalSetSelector({
  sets, selectedSetId, onSetChange, game, open, onOpenChange,
}: CanonicalSetSelectorProps) {
  const handleValueChange = (value: string) => {
    onSetChange(value === 'all' ? null : value);
  };

  const sortedSets = [...sets].sort((a, b) => {
    if (game === 'one_piece') {
      const getOpNumber = (name: string) => {
        const match = name.match(/OP(\d+)/);
        return match ? parseInt(match[1], 10) : 99;
      };
      return getOpNumber(a.set_name) - getOpNumber(b.set_name);
    }
    const aIndex = POKEMON_SET_PRIORITY.indexOf(a.set_name);
    const bIndex = POKEMON_SET_PRIORITY.indexOf(b.set_name);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return b.weight - a.weight;
  });

  const selectedSet = sets.find(s => s.id === selectedSetId);

  return (
    <Select value={selectedSetId ?? 'all'} onValueChange={handleValueChange} open={open} onOpenChange={onOpenChange}>
      <SelectTrigger className="w-[200px] h-8 bg-secondary/30 border-border/30 text-xs">
        <Layers className="h-3 w-3 mr-2 text-muted-foreground" />
        <SelectValue>{selectedSet ? selectedSet.set_name : 'All Sets'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">All Canonical Sets</SelectItem>
        <SelectSeparator />
        {sortedSets.map((set) => (
          <SelectItem key={set.id} value={set.id} className="text-xs">{set.set_name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
