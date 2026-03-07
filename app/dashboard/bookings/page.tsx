"use client";

import { useState } from "react";
import { CalendarDays, Check, Clock, Phone, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type BookingStatus = "REQUESTED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "REFUNDED";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  packageName: string;
  address: string;
  scheduledDate: string;
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

const DEMO_BOOKINGS: Booking[] = [
  {
    id: "1",
    customerName: "Sarah Johnson",
    customerEmail: "sarah@example.com",
    customerPhone: "(555) 123-4567",
    packageName: "Standard",
    address: "123 Oak Dr, Austin, TX 78701",
    scheduledDate: "2026-12-20",
    totalCents: 39900,
    depositCents: 11970,
    status: "REQUESTED",
    notes: "Two-story colonial, prefer warm white lights",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "2",
    customerName: "Mike Chen",
    customerEmail: "mike@example.com",
    customerPhone: "(555) 987-6543",
    packageName: "Premium",
    address: "456 Elm St, Austin, TX 78702",
    scheduledDate: "2026-12-22",
    totalCents: 79900,
    depositCents: 23970,
    status: "CONFIRMED",
    notes: "",
    createdAt: "2026-02-28T14:30:00Z",
  },
];

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(DEMO_BOOKINGS);
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");

  const filtered = filter === "ALL" ? bookings : bookings.filter((b) => b.status === filter);

  function updateStatus(id: string, status: BookingStatus) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Bookings</h2>
        <p className="text-muted-foreground">Manage customer bookings and appointments.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "REQUESTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const).map(
          (s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s === "ALL" ? "All" : s.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
            </Button>
          )
        )}
      </div>

      {/* Bookings list */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-medium">No bookings yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bookings will appear here when customers book through your site.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{booking.customerName}</CardTitle>
                    <CardDescription className="mt-1">
                      {booking.packageName} &middot; {booking.scheduledDate} &middot; {booking.address}
                    </CardDescription>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[booking.status]}`}>
                    {booking.status.replace(/_/g, " ")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total</span>
                    <div className="font-semibold">{formatCents(booking.totalCents)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deposit</span>
                    <div className="font-semibold">{formatCents(booking.depositCents)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact</span>
                    <div className="flex items-center gap-1 font-medium">
                      <Phone className="h-3 w-3" /> {booking.customerPhone}
                    </div>
                  </div>
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
                        onClick={() => updateStatus(booking.id, "CONFIRMED")}
                      >
                        <Check className="mr-1 h-3 w-3" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(booking.id, "CANCELED")}
                      >
                        <X className="mr-1 h-3 w-3" /> Decline
                      </Button>
                    </>
                  )}
                  {booking.status === "CONFIRMED" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(booking.id, "IN_PROGRESS")}
                    >
                      <Clock className="mr-1 h-3 w-3" /> Start Job
                    </Button>
                  )}
                  {booking.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(booking.id, "COMPLETED")}
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
