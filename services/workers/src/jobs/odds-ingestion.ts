import type { Job } from "bullmq";
import type {
  OddsIngestionPayload,
  JobResult,
  OddsEvent,
} from "@omnimarket/shared";
import { getSupabaseServiceClient } from "../lib/supabase.js";
import { childLogger } from "../lib/logger.js";
import { env } from "../lib/env.js";

const log = childLogger({ job: "odds-ingestion" });

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

async function fetchOdds(
  sportKey: string,
  markets: string[],
  regions: string[],
): Promise<OddsEvent[]> {
  if (!env.ODDS_API_KEY) {
    throw new Error("ODDS_API_KEY not configured");
  }

  const params = new URLSearchParams({
    apiKey: env.ODDS_API_KEY,
    regions: regions.join(","),
    markets: markets.join(","),
    oddsFormat: "american",
  });

  const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?${params}`;
  const resp = await fetch(url);

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Odds API error ${resp.status}: ${body}`);
  }

  return resp.json() as Promise<OddsEvent[]>;
}

export async function oddsIngestion(
  job: Job<OddsIngestionPayload>,
): Promise<JobResult> {
  const { sportKey, markets, regions } = job.data;
  const log2 = log.child({ sportKey });
  log2.info({ markets, regions }, "Starting odds ingestion");

  const supabase = getSupabaseServiceClient();
  const events = await fetchOdds(sportKey, markets, regions);

  log2.info({ count: events.length }, "Events fetched from Odds API");

  let recordsInserted = 0;
  for (const event of events) {
    for (const bookmaker of event.bookmakers) {
      for (const market of bookmaker.markets) {
        const { error } = await supabase.from("odds_records").upsert(
          {
            event_id: event.id,
            sport_key: event.sportKey,
            sport_title: event.sportTitle,
            commence_time: event.commenceTime,
            home_team: event.homeTeam,
            away_team: event.awayTeam,
            bookmaker_key: bookmaker.key,
            bookmaker_title: bookmaker.title,
            market_key: market.key,
            outcomes: market.outcomes,
            last_update: bookmaker.lastUpdate,
            ingested_at: new Date().toISOString(),
          },
          {
            onConflict: "event_id,bookmaker_key,market_key",
          },
        );

        if (error) {
          log2.warn({ error, eventId: event.id }, "Failed to upsert odds record");
        } else {
          recordsInserted++;
        }
      }
    }
  }

  log2.info({ recordsInserted }, "Odds ingestion complete");

  return {
    success: true,
    message: `Ingested ${recordsInserted} odds records for ${events.length} events`,
    data: {
      sportKey,
      eventsProcessed: events.length,
      oddsRecordsInserted: recordsInserted,
      ingestedAt: new Date().toISOString(),
    },
    processedAt: new Date().toISOString(),
  };
}
