import type { Job } from "bullmq";
import type { EvCalculationPayload, JobResult } from "@omnimarket/shared";
import { getSupabaseServiceClient } from "../lib/supabase.js";
import { childLogger } from "../lib/logger.js";

const log = childLogger({ job: "ev-calculation" });

interface OddsRecord {
  bookmaker_key: string;
  market_key: string;
  outcomes: Array<{ name: string; price: number; point?: number }>;
}

function americanToImplied(american: number): number {
  if (american > 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}

function calculateNoVigProbability(outcomes: number[]): number[] {
  const implied = outcomes.map(americanToImplied);
  const total = implied.reduce((a, b) => a + b, 0);
  return implied.map((p) => p / total);
}

function americanToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

export async function evCalculation(
  job: Job<EvCalculationPayload>,
): Promise<JobResult> {
  const { eventId, sportKey, bookmakers: targetBookmakers } = job.data;
  const log2 = log.child({ eventId, sportKey });
  log2.info("Calculating EV for event");

  const supabase = getSupabaseServiceClient();

  const { data: records, error } = await supabase
    .from("odds_records")
    .select("bookmaker_key, market_key, outcomes")
    .eq("event_id", eventId)
    .in("bookmaker_key", targetBookmakers);

  if (error) throw new Error(`Failed to fetch odds records: ${error.message}`);
  if (!records || records.length === 0) {
    return {
      success: false,
      message: "No odds records found for event",
      processedAt: new Date().toISOString(),
    };
  }

  // Group by market
  const byMarket = new Map<string, OddsRecord[]>();
  for (const rec of records as OddsRecord[]) {
    const key = rec.market_key;
    if (!byMarket.has(key)) byMarket.set(key, []);
    byMarket.get(key)!.push(rec);
  }

  const evRows: Array<{
    event_id: string;
    bookmaker_key: string;
    market_key: string;
    outcome_name: string;
    american_odds: number;
    no_vig_prob: number;
    ev_percent: number;
    calculated_at: string;
  }> = [];

  for (const [marketKey, marketRecords] of byMarket) {
    // Build consensus no-vig probabilities across all books
    const outcomeProbsByName = new Map<string, number[]>();
    for (const rec of marketRecords) {
      const prices = rec.outcomes.map((o) => o.price);
      const noVig = calculateNoVigProbability(prices);
      rec.outcomes.forEach((o, i) => {
        if (!outcomeProbsByName.has(o.name))
          outcomeProbsByName.set(o.name, []);
        outcomeProbsByName.get(o.name)!.push(noVig[i]!);
      });
    }

    const consensusProb = new Map<string, number>();
    for (const [name, probs] of outcomeProbsByName) {
      consensusProb.set(
        name,
        probs.reduce((a, b) => a + b, 0) / probs.length,
      );
    }

    // Calculate EV per book/outcome
    for (const rec of marketRecords) {
      for (const outcome of rec.outcomes) {
        const prob = consensusProb.get(outcome.name) ?? 0;
        const decimal = americanToDecimal(outcome.price);
        const evPercent = (prob * decimal - 1) * 100;

        evRows.push({
          event_id: eventId,
          bookmaker_key: rec.bookmaker_key,
          market_key: marketKey,
          outcome_name: outcome.name,
          american_odds: outcome.price,
          no_vig_prob: Math.round(prob * 10000) / 10000,
          ev_percent: Math.round(evPercent * 100) / 100,
          calculated_at: new Date().toISOString(),
        });
      }
    }
  }

  if (evRows.length > 0) {
    const { error: insertErr } = await supabase
      .from("ev_calculations")
      .upsert(evRows, {
        onConflict: "event_id,bookmaker_key,market_key,outcome_name",
      });

    if (insertErr) throw new Error(`Failed to save EV rows: ${insertErr.message}`);
  }

  const positiveEv = evRows.filter((r) => r.ev_percent > 0);
  log2.info(
    { total: evRows.length, positiveEv: positiveEv.length },
    "EV calculation complete",
  );

  return {
    success: true,
    message: `Calculated EV for ${evRows.length} outcomes (${positiveEv.length} positive)`,
    data: { evRows, positiveEv },
    processedAt: new Date().toISOString(),
  };
}
