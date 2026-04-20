import { useMemo } from 'react';
import type { TcgTarget, TcgTrait, TcgSet } from '@/types/tcg';

export interface Recommendation {
  id: string;
  query: string;
  trait: string;
  setHint: string | null;
  score: number;
}

export function generateRecommendations(
  target: TcgTarget,
  traits: TcgTrait[],
  sets: TcgSet[],
  count: number = 12
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const targetPriorityWeight = target.priority / 10;

  const topTraits = traits.slice(0, 6);
  const topSets = sets.slice(0, 6);

  for (const trait of topTraits) {
    const traitScore = trait.weight * 2 + targetPriorityWeight;
    const searchTerm = trait.search_terms.split('|')[0];
    
    recommendations.push({
      id: `${target.name}-${trait.trait}`,
      query: `${target.name} ${searchTerm}`,
      trait: trait.trait,
      setHint: null,
      score: traitScore
    });

    for (const set of topSets.slice(0, 3)) {
      const combinedScore = trait.weight * 2 + set.weight + targetPriorityWeight;
      recommendations.push({
        id: `${target.name}-${trait.trait}-${set.set_name}`,
        query: `${target.name} ${searchTerm} ${set.set_name}`,
        trait: trait.trait,
        setHint: set.set_name,
        score: combinedScore
      });
    }
  }

  return recommendations.sort((a, b) => b.score - a.score).slice(0, count);
}

export function useRecommendations(
  target: TcgTarget | null,
  traits: TcgTrait[],
  sets: TcgSet[]
) {
  return useMemo(() => {
    if (!target || traits.length === 0 || sets.length === 0) return [];
    return generateRecommendations(target, traits, sets);
  }, [target, traits, sets]);
}
