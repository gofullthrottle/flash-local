export const dynamic = "force-dynamic";

import { getProviderForCurrentUser } from "@/lib/auth/session";
import { getAllBookings } from "@/lib/dashboard/queries";
import { BookingsContent, type DashboardBooking } from "./bookings-content";

export default async function BookingsPage() {
  const provider = await getProviderForCurrentUser();
  if (!provider) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Bookings
        </h2>
        <p className="text-muted-foreground">
          Complete onboarding to start receiving bookings.
        </p>
      </div>
    );
  }

  const rawBookings = await getAllBookings(provider.id);

  const bookings: DashboardBooking[] = rawBookings.map((b: any) => {
    const snap = b.customer_snapshot ?? {};
    const pkg = Array.isArray(b.service_packages)
      ? b.service_packages[0]
      : b.service_packages;
    return {
      id: b.id,
      customerName: snap.name ?? "Customer",
      customerEmail: snap.email ?? "",
      customerPhone: snap.phone ?? "",
      packageName: pkg?.name ?? "—",
      address: snap.address ?? "",
      scheduledDate: b.scheduled_start ?? null,
      totalCents: b.total_amount_cents ?? 0,
      depositCents: b.deposit_amount_cents ?? 0,
      status: b.status,
      notes: b.notes ?? "",
      createdAt: b.created_at,
    };
  });

  return <BookingsContent initialBookings={bookings} />;
}
