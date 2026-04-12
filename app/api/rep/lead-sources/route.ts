import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { NICHE_OPPORTUNITIES } from "@/lib/lead-sourcing/strategies";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET: Return niche verticals with opportunity scores + local saturation hints
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  // Fetch niche verticals from DB
  const { data: verticals } = await db
    .from("niche_verticals")
    .select("*")
    .eq("is_active", true)
    .order("avg_job_value_cents", { ascending: false });

  // Count existing providers per vertical to estimate local saturation
  const { data: providerCounts } = await db
    .from("providers")
    .select("vertical_id")
    .eq("status", "ACTIVE");

  const countByVertical: Record<string, number> = {};
  providerCounts?.forEach((p: { vertical_id: string }) => {
    countByVertical[p.vertical_id] = (countByVertical[p.vertical_id] ?? 0) + 1;
  });

  // Merge DB data with opportunity intelligence
  const enriched = verticals?.map((v: { id: string; avg_job_value_cents: number | null; gbp_competition: string | null; [key: string]: unknown }) => {
    const opp = NICHE_OPPORTUNITIES.find((o) => o.vertical_id === v.id);
    return {
      ...v,
      existing_providers: countByVertical[v.id] ?? 0,
      pitch_angle: opp?.pitch_angle ?? null,
      online_saturation: opp?.online_saturation ?? "unknown",
      typical_cac_cents: opp?.typical_cac_cents ?? null,
      opportunity_rank: calculateOpportunityRank(v, countByVertical[v.id] ?? 0),
    };
  });

  // Sort by opportunity rank (highest first)
  enriched?.sort((a: { opportunity_rank: number }, b: { opportunity_rank: number }) => b.opportunity_rank - a.opportunity_rank);

  return NextResponse.json({ verticals: enriched });
}

function calculateOpportunityRank(
  vertical: { avg_job_value_cents: number | null; gbp_competition: string | null },
  existingProviders: number
): number {
  let rank = 50;

  // High job value = more commission potential
  const jobValue = vertical.avg_job_value_cents ?? 0;
  if (jobValue >= 500000) rank += 25;
  else if (jobValue >= 100000) rank += 15;
  else if (jobValue >= 30000) rank += 5;

  // Low GBP competition = easier to pitch "be first on Google"
  if (vertical.gbp_competition === "low") rank += 20;
  else if (vertical.gbp_competition === "medium") rank += 10;

  // Fewer existing providers on our platform = more territory
  if (existingProviders === 0) rank += 10;
  else if (existingProviders < 5) rank += 5;
  else rank -= 5;

  return Math.min(100, Math.max(0, rank));
}
