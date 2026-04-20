export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSalesRepForCurrentUser } from "@/lib/auth/rep-session";
import { ProspectCaptureForm } from "@/components/rep/prospect-capture-form";
import { createServerClient } from "@/lib/supabase/server";

export default async function ProspectsPage() {
  const rep = await getSalesRepForCurrentUser();
  if (!rep) redirect("/rep/join");

  const supabase = createServerClient();
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .eq("rep_id", rep.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const dueForFollowUp = prospects?.filter(
    (p) =>
      p.follow_up_date &&
      new Date(p.follow_up_date) <= new Date() &&
      !["CONVERTED", "LOST"].includes(p.status)
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Prospects</h2>
        <p className="text-muted-foreground">
          Capture and manage your sales pipeline
        </p>
      </div>

      {/* Follow-up alerts */}
      {dueForFollowUp && dueForFollowUp.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800">
            {dueForFollowUp.length} prospect{dueForFollowUp.length > 1 ? "s" : ""}{" "}
            due for follow-up
          </p>
          <ul className="mt-2 space-y-1">
            {dueForFollowUp.slice(0, 5).map((p) => (
              <li key={p.id} className="text-sm text-yellow-700">
                {p.business_name}
                {p.contact_name ? ` (${p.contact_name})` : ""}
                {p.phone ? ` — ${p.phone}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick capture form */}
      <div className="rounded-lg border bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">Quick Capture</h3>
        <ProspectCaptureForm />
      </div>

      {/* Prospect list */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">
          All Prospects ({prospects?.length ?? 0})
        </h3>

        {(!prospects || prospects.length === 0) ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">
              No prospects yet. Start scouting or capture your first prospect above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {prospects.map((prospect) => (
              <div
                key={prospect.id}
                className="flex items-start justify-between rounded-lg border bg-background p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{prospect.business_name}</p>
                    <StatusBadge status={prospect.status} />
                  </div>
                  {prospect.contact_name && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {prospect.contact_name}
                      {prospect.phone ? ` — ${prospect.phone}` : ""}
                    </p>
                  )}
                  {prospect.notes && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {prospect.notes}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(prospect.created_at).toLocaleDateString()}
                    {prospect.vertical_id && ` | ${prospect.vertical_id}`}
                    {prospect.estimated_value_cents &&
                      ` | ~$${(prospect.estimated_value_cents / 100).toLocaleString()}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-purple-100 text-purple-800",
  INTERESTED: "bg-yellow-100 text-yellow-800",
  FOLLOW_UP: "bg-orange-100 text-orange-800",
  CONVERTED: "bg-green-100 text-green-800",
  LOST: "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}
