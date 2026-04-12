import Link from "next/link";
import {
  Compass,
  DollarSign,
  LayoutDashboard,
  MapPin,
  UserPlus,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { MobileNav } from "@/app/dashboard/mobile-nav";
import { signOut } from "@/lib/auth/actions";

const REP_NAV_ITEMS = [
  { href: "/rep", label: "Overview", icon: LayoutDashboard },
  { href: "/rep/prospects", label: "Prospects", icon: Users },
  { href: "/rep/scout", label: "Scout", icon: Compass },
  { href: "/rep/enroll", label: "Enroll Business", icon: UserPlus },
  { href: "/rep/earnings", label: "Earnings", icon: DollarSign },
];

export default async function RepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — hidden on mobile, visible on lg+ */}
      <aside className="hidden w-64 shrink-0 border-r bg-muted/30 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/rep" className="font-display text-lg font-bold">
              Flash<span className="text-primary/70">Local</span>
              <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Rep
              </span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {REP_NAV_ITEMS.map((item) => (
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
            <MobileNav items={REP_NAV_ITEMS} />
            <Link href="/rep" className="font-display text-lg font-bold lg:hidden">
              Flash<span className="text-primary/70">Local</span>
              <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Rep
              </span>
            </Link>
            <div className="hidden items-center gap-2 lg:flex">
              <MapPin className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold">Sales Rep HQ</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
