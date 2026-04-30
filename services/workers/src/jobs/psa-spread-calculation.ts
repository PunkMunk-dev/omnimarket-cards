import type { Job } from "bullmq";
import type { PsaSpreadPayload, JobResult, PsaSpread } from "@omnimarket/shared";
import { getSupabaseServiceClient } from "../lib/supabase.js";
import { childLogger } from "../lib/logger.js";

const log = childLogger({ job: "psa-spread-calculation" });

interface SaleRow {
  grade: number;
  sale_price: number;
  sale_date: string;
}

async function fetchSales(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  cardId: string,
  grade: number,
): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from("psa_card_sales")
    .select("grade, sale_price, sale_date")
    .eq("card_id", cardId)
    .eq("grade", grade)
    .order("sale_date", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Failed to fetch PSA sales: ${error.message}`);
  return (data ?? []) as SaleRow[];
}

function average(prices: number[]): number {
  if (prices.length === 0) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

export async function psaSpreadCalculation(
  job: Job<PsaSpreadPayload>,
): Promise<JobResult> {
  const { cardId, gradeFrom, gradeTo } = job.data;
  const log2 = log.child({ cardId, gradeFrom, gradeTo });
  log2.info("Calculating PSA spread");

  const supabase = getSupabaseServiceClient();

  const [salesFrom, salesTo] = await Promise.all([
    fetchSales(supabase, cardId, gradeFrom),
    fetchSales(supabase, cardId, gradeTo),
  ]);

  if (salesFrom.length === 0 || salesTo.length === 0) {
    log2.warn("Insufficient sales data for spread calculation");
    return {
      success: false,
      message: "Insufficient sales data",
      processedAt: new Date().toISOString(),
    };
  }

  const avgFrom = average(salesFrom.map((s) => s.sale_price));
  const avgTo = average(salesTo.map((s) => s.sale_price));
  const spreadAmount = avgTo - avgFrom;
  const spreadPercent = avgFrom > 0 ? (spreadAmount / avgFrom) * 100 : 0;
  const gradingCostEstimate = 50;
  const roiEstimate =
    avgFrom > 0
      ? ((avgTo - avgFrom - gradingCostEstimate) / (avgFrom + gradingCostEstimate)) * 100
      : 0;

  const spread: PsaSpread = {
    cardId,
    gradeFrom,
    gradeTo,
    avgPriceFrom: Math.round(avgFrom * 100) / 100,
    avgPriceTo: Math.round(avgTo * 100) / 100,
    spreadAmount: Math.round(spreadAmount * 100) / 100,
    spreadPercent: Math.round(spreadPercent * 100) / 100,
    roiEstimate: Math.round(roiEstimate * 100) / 100,
    sampleSizeFrom: salesFrom.length,
    sampleSizeTo: salesTo.length,
    calculatedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from("psa_spreads").upsert(
    {
      card_id: spread.cardId,
      grade_from: spread.gradeFrom,
      grade_to: spread.gradeTo,
      avg_price_from: spread.avgPriceFrom,
      avg_price_to: spread.avgPriceTo,
      spread_amount: spread.spreadAmount,
      spread_percent: spread.spreadPercent,
      roi_estimate: spread.roiEstimate,
      sample_size_from: spread.sampleSizeFrom,
      sample_size_to: spread.sampleSizeTo,
      calculated_at: spread.calculatedAt,
    },
    { onConflict: "card_id,grade_from,grade_to" },
  );

  if (error) throw new Error(`Failed to save spread: ${error.message}`);

  log2.info({ spread }, "PSA spread calculated and saved");

  return {
    success: true,
    message: `Spread calculated: ${spread.spreadPercent}% (ROI est: ${spread.roiEstimate}%)`,
    data: spread,
    processedAt: new Date().toISOString(),
  };
}
