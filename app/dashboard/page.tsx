export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProviderForCurrentUser } from "@/lib/auth/session";
import {
  getDashboardStats,
  getRecentBookings,
} from "@/lib/dashboard/queries";
import { createServerClient } from "@/lib/supabase/server";

function formatCurrency(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function DashboardOverview() {
  const provider = await getProviderForCurrentUser();

  if (!provider) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Welcome
        </h2>
        <p className="text-muted-foreground">
          Finish setting up your business to see your dashboard.{" "}
          <Link href="/start" className="underline">
            Start onboarding
          </Link>
        </p>
      </div>
    );
  }

  const [stats, recentBookings, reviewsCountRes] = await Promise.all([
    getDashboardStats(provider.id),
    getRecentBookings(provider.id, 3),
    createServerClient()
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", provider.id)
      .eq("is_published", true),
  ]);

  const site = Array.isArray(provider.sites) ? provider.sites[0] : provider.sites;
  const siteStatus = site?.is_live ? "Live" : "Pending";
  const reviewsCount = reviewsCountRes.count ?? 0;

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenueCents),
      sub: "All time",
      icon: DollarSign,
    },
    {
      title: "Bookings",
      value: String(stats.thisMonth),
      sub: "This month",
      icon: CalendarDays,
    },
    {
      title: "Pending",
      value: String(stats.pending),
      sub: "Awaiting confirmation",
      icon: CreditCard,
    },
    {
      title: "Conversion",
      value: `${stats.conversion}%`,
      sub: "Requested → confirmed",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Welcome back, {provider.display_name}
        </h2>
        <p className="text-muted-foreground">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Bookings</CardTitle>
            <CardDescription>
              {recentBookings.length === 0
                ? "No bookings yet"
                : `${recentBookings.length} recent booking${recentBookings.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bookings will appear here once customers start booking through
                your site.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentBookings.map((b: any) => {
                  const customer =
                    b.customer_snapshot?.name ?? "Customer";
                  return (
                    <li key={b.id} className="flex justify-between">
                      <span className="truncate">{customer}</span>
                      <Badge variant="secondary" className="text-xs">
                        {b.status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard/bookings">
                View all <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Site Status</CardTitle>
            <CardDescription>
              <Badge variant={siteStatus === "Live" ? "default" : "secondary"}>
                {siteStatus}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {siteStatus === "Live"
                ? `Your site is live at ${provider.slug}.flashlocal.com`
                : "Complete your setup to go live and start accepting customers."}
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard/site">
                Manage site <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reviews</CardTitle>
            <CardDescription>
              {reviewsCount} review{reviewsCount === 1 ? "" : "s"} collected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Send review requests to customers after completing jobs.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard/reviews">
                Manage reviews <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
