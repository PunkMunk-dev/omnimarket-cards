import type { Job } from "bullmq";
import type { LeadScrapingPayload, JobResult, Lead } from "@omnimarket/shared";
import { getSupabaseServiceClient } from "../lib/supabase.js";
import { childLogger } from "../lib/logger.js";

const log = childLogger({ job: "lead-scraping" });

/**
 * Scrapes marketplace listings for trading card leads.
 *
 * Production implementation would integrate headless browser (Playwright) or
 * dedicated scraping APIs (ScraperAPI, BrightData) per source. This scaffold
 * shows the structure and DB persistence layer.
 */
async function scrapeSource(
  source: LeadScrapingPayload["source"],
  keywords: string[],
  location?: string,
  maxResults?: number,
): Promise<Lead[]> {
  log.debug({ source, keywords, location }, "Scraping source");

  // Stub: replace with real scraper per source
  switch (source) {
    case "facebook":
      return scrapeFacebook(keywords, location, maxResults);
    case "craigslist":
      return scrapeCraigslist(keywords, location, maxResults);
    case "offerup":
      return scrapeOfferUp(keywords, maxResults);
    case "mercari":
      return scrapeMercari(keywords, maxResults);
    default:
      throw new Error(`Unsupported source: ${source}`);
  }
}

async function scrapeFacebook(
  keywords: string[],
  _location?: string,
  _maxResults?: number,
): Promise<Lead[]> {
  // Facebook Marketplace requires authenticated scraping.
  // Use a third-party scraping API in production.
  log.warn("Facebook Marketplace scraping is a stub — integrate a scraper API");
  return keywords.map((kw, i) => ({
    source: "facebook" as const,
    title: `[STUB] ${kw} listing #${i + 1}`,
    url: `https://www.facebook.com/marketplace/item/${Date.now() + i}`,
    scrapedAt: new Date().toISOString(),
    keywords,
  }));
}

async function scrapeCraigslist(
  keywords: string[],
  location?: string,
  _maxResults?: number,
): Promise<Lead[]> {
  const area = location ?? "sfbay";
  log.debug({ area, keywords }, "Craigslist scrape (stub)");
  return keywords.map((kw, i) => ({
    source: "craigslist" as const,
    title: `[STUB] ${kw} - ${area} #${i + 1}`,
    url: `https://craigslist.org/${area}/search?query=${encodeURIComponent(kw)}`,
    scrapedAt: new Date().toISOString(),
    keywords,
  }));
}

async function scrapeOfferUp(
  keywords: string[],
  _maxResults?: number,
): Promise<Lead[]> {
  log.debug({ keywords }, "OfferUp scrape (stub)");
  return keywords.map((kw, i) => ({
    source: "offerup" as const,
    title: `[STUB] ${kw} #${i + 1}`,
    url: `https://offerup.com/search/?q=${encodeURIComponent(kw)}`,
    scrapedAt: new Date().toISOString(),
    keywords,
  }));
}

async function scrapeMercari(
  keywords: string[],
  _maxResults?: number,
): Promise<Lead[]> {
  log.debug({ keywords }, "Mercari scrape (stub)");
  return keywords.map((kw, i) => ({
    source: "mercari" as const,
    title: `[STUB] ${kw} #${i + 1}`,
    url: `https://www.mercari.com/search/?keyword=${encodeURIComponent(kw)}`,
    scrapedAt: new Date().toISOString(),
    keywords,
  }));
}

export async function leadScraping(
  job: Job<LeadScrapingPayload>,
): Promise<JobResult> {
  const { source, keywords, location, maxResults } = job.data;
  const log2 = log.child({ source });
  log2.info({ keywords }, "Starting lead scraping");

  const supabase = getSupabaseServiceClient();
  const leads = await scrapeSource(source, keywords, location, maxResults);

  log2.info({ count: leads.length }, "Leads scraped");

  let inserted = 0;
  if (leads.length > 0) {
    const rows = leads.map((l) => ({
      source: l.source,
      title: l.title,
      price: l.price ?? null,
      description: l.description ?? null,
      url: l.url,
      location: l.location ?? null,
      image_url: l.imageUrl ?? null,
      posted_at: l.postedAt ?? null,
      scraped_at: l.scrapedAt,
      keywords: l.keywords,
    }));

    const { error } = await supabase
      .from("leads")
      .upsert(rows, { onConflict: "url" });

    if (error) throw new Error(`Failed to insert leads: ${error.message}`);
    inserted = leads.length;
  }

  return {
    success: true,
    message: `Scraped ${leads.length} leads from ${source}, inserted ${inserted}`,
    data: { source, leadsFound: leads.length, leadsInserted: inserted },
    processedAt: new Date().toISOString(),
  };
}
