import type { Job } from "bullmq";
import type {
  EbaySavedSearchPayload,
  JobResult,
  EbayListing,
} from "@omnimarket/shared";
import { getSupabaseServiceClient } from "../lib/supabase.js";
import { childLogger } from "../lib/logger.js";

const log = childLogger({ job: "ebay-saved-search-refresh" });

async function fetchEbayListings(
  keywords: string,
  opts: {
    categoryId?: string;
    maxPrice?: number;
    minPrice?: number;
  },
): Promise<EbayListing[]> {
  // In production this would call the eBay Browse API or Finding API.
  // Here we delegate to the Supabase Edge Function to avoid CORS / API-key
  // duplication.
  log.debug({ keywords, opts }, "Fetching eBay listings");

  const supabase = getSupabaseServiceClient();
  const params: Record<string, string> = { keywords };
  if (opts.categoryId) params.categoryId = opts.categoryId;
  if (opts.maxPrice != null) params.maxPrice = String(opts.maxPrice);
  if (opts.minPrice != null) params.minPrice = String(opts.minPrice);

  const { data, error } = await supabase.functions.invoke("ebay-search", {
    body: params,
  });

  if (error) {
    log.error({ error }, "Edge function error");
    throw new Error(`eBay search failed: ${error.message}`);
  }

  const items: EbayListing[] = Array.isArray(data?.items) ? data.items : [];
  return items;
}

export async function ebaySavedSearchRefresh(
  job: Job<EbaySavedSearchPayload>,
): Promise<JobResult> {
  const { savedSearchId, keywords, categoryId, maxPrice, minPrice } = job.data;
  const log2 = log.child({ savedSearchId });
  log2.info("Starting eBay saved search refresh");

  const supabase = getSupabaseServiceClient();

  const listings = await fetchEbayListings(keywords, {
    categoryId,
    maxPrice,
    minPrice,
  });

  log2.info({ count: listings.length }, "Listings fetched");

  if (listings.length > 0) {
    const rows = listings.map((l) => ({
      saved_search_id: savedSearchId,
      item_id: l.itemId,
      title: l.title,
      price: l.price,
      currency: l.currency,
      condition: l.condition,
      listing_url: l.listingUrl,
      image_url: l.imageUrl ?? null,
      end_time: l.endTime ?? null,
      refreshed_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("saved_search_listings")
      .upsert(rows, { onConflict: "saved_search_id,item_id" });

    if (upsertError) {
      log2.error({ error: upsertError }, "Failed to upsert listings");
      throw new Error(`DB upsert failed: ${upsertError.message}`);
    }
  }

  await supabase
    .from("ebay_saved_searches")
    .update({ last_refreshed_at: new Date().toISOString() })
    .eq("id", savedSearchId);

  log2.info("Saved search refresh complete");

  return {
    success: true,
    message: `Refreshed ${listings.length} listings for saved search ${savedSearchId}`,
    data: { count: listings.length },
    processedAt: new Date().toISOString(),
  };
}
