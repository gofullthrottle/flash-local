import { redirect } from "next/navigation";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import { CommissionActions } from "./commission-actions";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createServerClient();
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/");
  return user;
}

export default async function AdminCommissionsPage() {
  await requireAdminUser();

  const supabase = createServerClient();

  // Get all pending + approved commissions grouped by rep
  const { data: commissions } = await supabase
    .from("rep_commissions")
    .select(
      "id, rep_id, commission_cents, commission_pct, trigger_event, status, created_at, gross_amount_cents, providers(display_name), sales_reps(display_name, email, stripe_onboarding_complete)"
    )
    .in("status", ["PENDING", "APPROVED"])
    .order("created_at", { ascending: false });

  // Group by rep
  type RepGroup = {
    rep_id: string;
    rep_name: string;
    rep_email: string;
    connect_ready: boolean;
    pending_cents: number;
    approved_cents: number;
    commissions: typeof commissions;
  };

  const byRep = new Map<string, RepGroup>();
  commissions?.forEach((c: any) => {
    if (!byRep.has(c.rep_id)) {
      byRep.set(c.rep_id, {
        rep_id: c.rep_id,
        rep_name: c.sales_reps?.display_name ?? "Unknown",
        rep_email: c.sales_reps?.email ?? "",
        connect_ready: !!c.sales_reps?.stripe_onboarding_complete,
        pending_cents: 0,
        approved_cents: 0,
        commissions: [],
      });
    }
    const group = byRep.get(c.rep_id)!;
    if (c.status === "PENDING") group.pending_cents += c.commission_cents;
    if (c.status === "APPROVED") group.approved_cents += c.commission_cents;
    group.commissions!.push(c);
  });

  const groups = Array.from(byRep.values());

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Commission Payouts</h1>
        <p className="text-muted-foreground">
          Review, approve, and pay out sales rep commissions
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">
            No pending or approved commissions at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.rep_id} className="rounded-lg border bg-background p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{group.rep_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {group.rep_email}
                    {!group.connect_ready && (
                      <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Stripe not connected
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold text-yellow-600">
                      {formatCents(group.pending_cents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Approved</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCents(group.approved_cents)}
                    </p>
                  </div>
                </div>
              </div>

              <CommissionActions
                repId={group.rep_id}
                hasPending={group.pending_cents > 0}
                hasApproved={group.approved_cents > 0}
                connectReady={group.connect_ready}
              />

              <div className="mt-4 space-y-2">
                {group.commissions?.slice(0, 10).map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded border bg-muted/20 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {c.providers?.display_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.trigger_event.replace(/_/g, " ").toLowerCase()} |{" "}
                        {c.commission_pct}% of {formatCents(c.gross_amount_cents)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCents(c.commission_cents)}
                      </p>
                      <span
                        className={`text-xs ${
                          c.status === "PENDING"
                            ? "text-yellow-600"
                            : "text-blue-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
                {group.commissions && group.commissions.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    + {group.commissions.length - 10} more
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
