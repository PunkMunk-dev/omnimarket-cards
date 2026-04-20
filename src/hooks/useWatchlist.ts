import { useState, useEffect, useCallback } from "react";
import type { EbayItem, WatchlistItem } from "@/types/ebay";

const WATCHLIST_KEY = "ebay-card-watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load watchlist from localStorage:", error);
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch (error) {
      console.error("Failed to save watchlist to localStorage:", error);
    }
  }, [watchlist]);

  const addToWatchlist = useCallback((item: EbayItem) => {
    setWatchlist((prev) => {
      // Check if already in watchlist
      if (prev.some((w) => w.itemId === item.itemId)) {
        return prev;
      }
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  }, []);

  const removeFromWatchlist = useCallback((itemId: string) => {
    setWatchlist((prev) => prev.filter((item) => item.itemId !== itemId));
  }, []);

  const isInWatchlist = useCallback(
    (itemId: string) => {
      return watchlist.some((item) => item.itemId === itemId);
    },
    [watchlist]
  );

  const toggleWatchlist = useCallback(
    (item: EbayItem) => {
      if (isInWatchlist(item.itemId)) {
        removeFromWatchlist(item.itemId);
      } else {
        addToWatchlist(item);
      }
    },
    [isInWatchlist, removeFromWatchlist, addToWatchlist]
  );

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    clearWatchlist,
  };
}
