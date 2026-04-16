import { redirect } from "next/navigation";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function getSalesRepForCurrentUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sales_reps")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function requireSalesRep() {
  const rep = await getSalesRepForCurrentUser();
  if (!rep) redirect("/rep/join");
  return rep;
}

export async function getRepStats(repId: string) {
  const supabase = createServerClient();

  const [prospects, commissions, sessions] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, status", { count: "exact" })
      .eq("rep_id", repId),
    supabase
      .from("rep_commissions")
      .select("commission_cents, status")
      .eq("rep_id", repId),
    supabase
      .from("scout_sessions")
      .select("id, total_prospects, total_conversions")
      .eq("rep_id", repId),
  ]);

  const totalProspects = prospects.count ?? 0;
  const activeProspects =
    prospects.data?.filter((p) =>
      ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP"].includes(p.status)
    ).length ?? 0;
  const conversions =
    prospects.data?.filter((p) => p.status === "CONVERTED").length ?? 0;

  const pendingEarnings =
    commissions.data
      ?.filter((c) => c.status === "PENDING" || c.status === "APPROVED")
      .reduce((sum, c) => sum + c.commission_cents, 0) ?? 0;
  const paidEarnings =
    commissions.data
      ?.filter((c) => c.status === "PAID")
      .reduce((sum, c) => sum + c.commission_cents, 0) ?? 0;

  const totalSessions = sessions.data?.length ?? 0;

  return {
    totalProspects,
    activeProspects,
    conversions,
    conversionRate: totalProspects > 0 ? conversions / totalProspects : 0,
    pendingEarnings,
    paidEarnings,
    totalEarnings: pendingEarnings + paidEarnings,
    totalSessions,
  };
}
