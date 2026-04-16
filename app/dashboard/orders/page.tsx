export const dynamic = "force-dynamic";

import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProviderForCurrentUser } from "@/lib/auth/session";
import { getAllOrders } from "@/lib/dashboard/queries";

type OrderStatus =
  | "CREATED"
  | "REQUIRES_PAYMENT_METHOD"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED"
  | "DISPUTED";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CREATED: "outline",
  REQUIRES_PAYMENT_METHOD: "outline",
  PROCESSING: "secondary",
  SUCCEEDED: "default",
  FAILED: "destructive",
  REFUNDED: "destructive",
  DISPUTED: "destructive",
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function OrdersPage() {
  const provider = await getProviderForCurrentUser();
  if (!provider) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Orders
        </h2>
        <p className="text-muted-foreground">
          Complete onboarding to start receiving orders.
        </p>
      </div>
    );
  }

  const rawOrders = await getAllOrders(provider.id);

  const orders = rawOrders.map((o: any) => {
    const booking = Array.isArray(o.bookings) ? o.bookings[0] : o.bookings;
    const snap = booking?.customer_snapshot ?? {};
    return {
      id: o.id,
      bookingId: o.booking_id,
      customerName: snap.name ?? "Customer",
      amountCents: o.amount_cents ?? 0,
      feeCents: o.application_fee_cents ?? 0,
      payoutCents: o.provider_payout_cents ?? 0,
      refundedCents: o.refunded_cents ?? 0,
      status: o.status as OrderStatus,
      stripePaymentIntentId: o.stripe_payment_intent_id ?? "",
      createdAt: o.created_at,
    };
  });

  const totalCollected = orders.reduce((s, o) => s + o.amountCents, 0);
  const totalFees = orders.reduce((s, o) => s + o.feeCents, 0);
  const totalPayouts = orders.reduce((s, o) => s + o.payoutCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Orders
        </h2>
        <p className="text-muted-foreground">
          Payment history and transaction details.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCents(totalCollected)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCents(totalFees)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCents(totalPayouts)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No orders yet. Customer payments will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCents(order.amountCents)}
                      </div>
                      {order.feeCents > 0 && (
                        <div className="text-xs text-muted-foreground">
                          -{formatCents(order.feeCents)} fee
                        </div>
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
