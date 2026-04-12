import { redirect } from "next/navigation";
import { getSalesRepForCurrentUser, getRepStats } from "@/lib/auth/rep-session";
import { createServerClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";

export default async function EarningsPage() {
  const rep = await getSalesRepForCurrentUser();
  if (!rep) redirect("/rep/join");

  const stats = await getRepStats(rep.id);

  const supabase = createServerClient();
  const { data: commissions } = await supabase
    .from("rep_commissions")
    .select("*, providers(display_name, slug)")
    .eq("rep_id", rep.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Earnings</h2>
        <p className="text-muted-foreground">
          Track your commissions and payouts
        </p>
      </div>

      {/* Earnings summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Pending</p>
          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {formatCents(stats.pendingEarnings)}
          </p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Paid</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {formatCents(stats.paidEarnings)}
          </p>
        </div>
        <div className="col-span-2 rounded-lg border bg-background p-4 lg:col-span-1">
          <p className="text-xs font-medium text-muted-foreground">
            Lifetime Total
          </p>
          <p className="mt-2 text-2xl font-bold">
            {formatCents(stats.totalEarnings)}
          </p>
        </div>
      </div>

      {/* Stripe Connect status */}
      <div className="rounded-lg border bg-muted/30 p-6">
        <h3 className="font-semibold">Payout Setup</h3>
        {rep.stripe_onboarding_complete ? (
          <p className="mt-1 text-sm text-green-600">
            Stripe connected — payouts are active
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to receive commission payouts.
            </p>
            <button className="mt-3 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
              Connect Stripe
            </button>
          </div>
        )}
      </div>

      {/* Commission ledger */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Commission History</h3>

        {(!commissions || commissions.length === 0) ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">
              No commissions yet. Start signing up businesses to earn!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {commissions.map((c: any) => (
              <div
                key={c.id}
                className="flex items-start justify-between rounded-lg border bg-background p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {c.providers?.display_name ?? "Unknown Provider"}
                    </p>
                    <CommissionStatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.trigger_event.replace(/_/g, " ").toLowerCase()} |{" "}
                    {c.commission_pct}% of {formatCents(c.gross_amount_cents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-lg font-semibold">
                  {formatCents(c.commission_cents)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  VOIDED: "bg-red-100 text-red-800",
};

function CommissionStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}
