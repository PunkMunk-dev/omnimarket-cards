import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/deviceId';
import type { WatchlistItem, Game, EbayListing } from '@/types/tcg';

export function useTcgWatchlist() {
  const deviceId = getDeviceId();
  
  return useQuery({
    queryKey: ['tcg-watchlist', deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tcg_watchlist')
        .select('*')
        .eq('user_id', deviceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as WatchlistItem[];
    }
  });
}

export function useAddToTcgWatchlist() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  
  return useMutation({
    mutationFn: async ({ game, query, listing }: { game: Game; query: string; listing?: EbayListing }) => {
      const { data, error } = await supabase
        .from('tcg_watchlist')
        .insert({
          user_id: deviceId,
          game,
          query,
          listing_id: listing?.itemId || null,
          listing_title: listing?.title || null,
          listing_price: listing?.price.value || null,
          listing_image: listing?.image || null
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tcg-watchlist', deviceId] });
    }
  });
}

export function useRemoveFromTcgWatchlist() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tcg_watchlist')
        .delete()
        .eq('id', id)
        .eq('user_id', deviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tcg-watchlist', deviceId] });
    }
  });
}

export function useIsInTcgWatchlist(listingId: string | undefined) {
  const { data: watchlist } = useTcgWatchlist();
  if (!listingId || !watchlist) return false;
  return watchlist.some(item => item.listing_id === listingId);
}
