"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Check, Clock, Phone, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateBookingStatus } from "@/lib/dashboard/actions";

export type BookingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | "REFUNDED";

export interface DashboardBooking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  packageName: string;
  address: string;
  scheduledDate: string | null;
  totalCents: number;
  depositCents: number;
  status: BookingStatus;
  notes: string;
  createdAt: string;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELED: "bg-gray-100 text-gray-800 border-gray-200",
  REFUNDED: "bg-red-100 text-red-800 border-red-200",
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "Flexible";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

export function BookingsContent({
  initialBookings,
}: {
  initialBookings: DashboardBooking[];
}) {
  const [bookings, setBookings] = useState<DashboardBooking[]>(initialBookings);
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered =
    filter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === filter);

  function handleUpdateStatus(id: string, status: BookingStatus) {
    setError(null);
    // Optimistic update
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
    startTransition(async () => {
      const result = await updateBookingStatus(id, status);
      if ("error" in result && result.error) {
        setError(result.error);
        // Revert
        setBookings(initialBookings);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Bookings
        </h2>
        <p className="text-muted-foreground">
          Manage customer bookings and appointments.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            "ALL",
            "REQUESTED",
            "CONFIRMED",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELED",
          ] as const
        ).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === "ALL"
              ? "All"
              : s
                  .replace(/_/g, " ")
                  .toLowerCase()
                  .replace(/^\w/, (c) => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {/* Bookings list */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-medium">No bookings yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bookings will appear here when customers book through your
                site.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {booking.customerName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {booking.packageName} &middot;{" "}
                      {formatDate(booking.scheduledDate)} &middot;{" "}
                      {booking.address}
                    </CardDescription>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[booking.status]}`}
                  >
                    {booking.status.replace(/_/g, " ")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total</span>
                    <div className="font-semibold">
                      {formatCents(booking.totalCents)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deposit</span>
                    <div className="font-semibold">
                      {formatCents(booking.depositCents)}
                    </div>
                  </div>
                  {booking.customerPhone && (
                    <div>
                      <span className="text-muted-foreground">Contact</span>
                      <div className="flex items-center gap-1 font-medium">
                        <Phone className="h-3 w-3" /> {booking.customerPhone}
                      </div>
                    </div>
                  )}
                </div>
                {booking.notes && (
                  <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {booking.notes}
                  </p>
                )}
                <Separator className="my-4" />
                <div className="flex gap-2">
                  {booking.status === "REQUESTED" && (
                    <>
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          handleUpdateStatus(booking.id, "CONFIRMED")
                        }
                      >
                        <Check className="mr-1 h-3 w-3" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          handleUpdateStatus(booking.id, "CANCELED")
                        }
                      >
                        <X className="mr-1 h-3 w-3" /> Decline
                      </Button>
                    </>
                  )}
                  {booking.status === "CONFIRMED" && (
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        handleUpdateStatus(booking.id, "IN_PROGRESS")
                      }
                    >
                      <Clock className="mr-1 h-3 w-3" /> Start Job
                    </Button>
                  )}
                  {booking.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        handleUpdateStatus(booking.id, "COMPLETED")
                      }
                    >
                      <Check className="mr-1 h-3 w-3" /> Mark Complete
                    </Button>
                  )}
                  {booking.status === "COMPLETED" && (
                    <Button size="sm" variant="outline" asChild>
                      <a href="/dashboard/reviews">
                        <Send className="mr-1 h-3 w-3" /> Request Review
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
