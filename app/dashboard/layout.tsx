import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  Globe,
  LayoutDashboard,
  Link2,
  Megaphone,
  Settings,
  Star,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { MobileNav } from "./mobile-nav";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/dashboard/orders", label: "Orders", icon: CreditCard },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/ads", label: "Ads", icon: Megaphone },
  { href: "/dashboard/site", label: "My Site", icon: Globe },
  { href: "/dashboard/connect", label: "Payouts", icon: Link2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: middleware also enforces this, but double-check server-side
  await requireUser();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-muted/30 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/" className="font-display text-lg font-bold">
              Flash<span className="text-primary/70">Local</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t p-4">
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile header + main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <MobileNav items={NAV_ITEMS} />
            <Link href="/" className="font-display text-lg font-bold lg:hidden">
              Flash<span className="text-primary/70">Local</span>
            </Link>
            <h1 className="hidden text-lg font-semibold lg:block">Dashboard</h1>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
