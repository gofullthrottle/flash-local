import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, DollarSign, TrendingUp, UserPlus, Users } from "lucide-react";
import { getSalesRepForCurrentUser, getRepStats } from "@/lib/auth/rep-session";
import { formatCents } from "@/lib/utils";

export default async function RepDashboard() {
  const rep = await getSalesRepForCurrentUser();
  if (!rep) redirect("/rep/join");

  const stats = await getRepStats(rep.id);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">Welcome back, {rep.display_name}</h2>
        <p className="text-muted-foreground">
          Your referral code:{" "}
          <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">
            {rep.referral_code}
          </code>
        </p>
      </div>

      {/* Stats grid — 2x2 on mobile, 4-across on desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Prospects"
          value={stats.activeProspects.toString()}
          icon={<Users className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          label="Conversions"
          value={stats.conversions.toString()}
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          detail={`${(stats.conversionRate * 100).toFixed(0)}% rate`}
        />
        <StatCard
          label="Pending Earnings"
          value={formatCents(stats.pendingEarnings)}
          icon={<DollarSign className="h-5 w-5 text-yellow-500" />}
        />
        <StatCard
          label="Total Paid"
          value={formatCents(stats.paidEarnings)}
          icon={<DollarSign className="h-5 w-5 text-green-500" />}
        />
      </div>

      {/* Quick actions — big tap targets for field use */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAction
          href="/rep/scout"
          icon={<Compass className="h-8 w-8" />}
          title="Start Scouting"
          description="Walk a neighborhood, capture prospects with GPS tracking"
        />
        <QuickAction
          href="/rep/prospects"
          icon={<Users className="h-8 w-8" />}
          title="My Prospects"
          description={`${stats.activeProspects} active, ${stats.totalProspects} total`}
        />
        <QuickAction
          href="/rep/enroll"
          icon={<UserPlus className="h-8 w-8" />}
          title="Enroll a Business"
          description="Sign up a provider on the spot"
        />
      </div>

      {/* Share link card */}
      <div className="rounded-lg border bg-muted/30 p-6">
        <h3 className="font-semibold">Your Referral Link</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Share this link with businesses. When they sign up and upgrade, you
          earn a commission.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded border bg-background px-3 py-2 text-sm">
            {`flashlocal.com/start?ref=${rep.referral_code}`}
          </code>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {detail && (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-lg border bg-background p-5 transition-colors hover:bg-accent active:bg-accent"
    >
      <div className="shrink-0 text-primary">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
