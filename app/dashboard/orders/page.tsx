"use client";

import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OrderStatus = "CREATED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "DISPUTED";

interface Order {
  id: string;
  bookingId: string | null;
  customerName: string;
  amountCents: number;
  feeCents: number;
  payoutCents: number;
  refundedCents: number;
  status: OrderStatus;
  stripePaymentIntentId: string;
  createdAt: string;
}

const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  CREATED: "outline",
  PROCESSING: "secondary",
  SUCCEEDED: "default",
  FAILED: "destructive",
  REFUNDED: "destructive",
  DISPUTED: "destructive",
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const DEMO_ORDERS: Order[] = [
  {
    id: "ord_1",
    bookingId: "1",
    customerName: "Sarah Johnson",
    amountCents: 11970,
    feeCents: 1796,
    payoutCents: 10174,
    refundedCents: 0,
    status: "SUCCEEDED",
    stripePaymentIntentId: "pi_demo_001",
    createdAt: "2026-03-01T10:05:00Z",
  },
  {
    id: "ord_2",
    bookingId: "2",
    customerName: "Mike Chen",
    amountCents: 23970,
    feeCents: 3596,
    payoutCents: 20374,
    refundedCents: 0,
    status: "PROCESSING",
    stripePaymentIntentId: "pi_demo_002",
    createdAt: "2026-02-28T14:35:00Z",
  },
];

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">Payment history and transaction details.</p>
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
              {formatCents(DEMO_ORDERS.reduce((s, o) => s + o.amountCents, 0))}
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
            <div className="text-2xl font-bold">
              {formatCents(DEMO_ORDERS.reduce((s, o) => s + o.feeCents, 0))}
            </div>
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
              {formatCents(DEMO_ORDERS.reduce((s, o) => s + o.payoutCents, 0))}
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
          <div className="space-y-4">
            {DEMO_ORDERS.map((order) => (
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
                    <div className="font-semibold">{formatCents(order.amountCents)}</div>
                    {order.feeCents > 0 && (
                      <div className="text-xs text-muted-foreground">
                        -{formatCents(order.feeCents)} fee
                      </div>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[order.status]}>
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
