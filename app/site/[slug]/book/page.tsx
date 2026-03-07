"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const preselectedPackageId = searchParams.get("package");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    date: "",
    notes: "",
    packageId: preselectedPackageId ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Step 1: Resolve provider_id from slug
      // In production this comes from SSR props; for now we fetch
      const providerRes = await fetch(`/api/providers/resolve?slug=${slug}`);
      let providerId: string;
      if (providerRes.ok) {
        const providerData = await providerRes.json();
        providerId = providerData.provider_id;
      } else {
        // Fallback: use a dummy for demo — in production this is always resolved
        providerId = "";
        setError("Could not resolve provider. Please try again.");
        setSubmitting(false);
        return;
      }

      // Step 2: Create the booking + lead
      const bookingRes = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: providerId,
          package_id: form.packageId,
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          address: form.address,
          scheduled_date: form.date,
          notes: form.notes,
        }),
      });

      if (!bookingRes.ok) {
        const err = await bookingRes.json();
        throw new Error(err.error ?? "Booking failed");
      }

      const bookingData = await bookingRes.json();

      // Step 3: Create Stripe Checkout session
      const checkoutRes = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: providerId,
          order_kind: "CUSTOMER_BOOKING",
          booking_id: bookingData.booking_id,
          package_id: form.packageId,
          success_url: `${window.location.origin}/site/${slug}/book/success`,
          cancel_url: window.location.href,
        }),
      });

      if (!checkoutRes.ok) {
        // Checkout creation failed — still show success for the booking
        setSuccess(true);
        return;
      }

      const checkoutData = await checkoutRes.json();

      if (checkoutData.url) {
        // Redirect to Stripe Checkout
        window.location.href = checkoutData.url;
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="font-display text-2xl">
              Booking Confirmed!
            </CardTitle>
            <CardDescription>
              You'll receive a confirmation email at {form.email} shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{form.date || "Flexible"}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-right">{form.address}</span>
              </div>
            </div>
            <Button className="w-full mt-4" asChild>
              <a href={`/site/${slug}`}>Back to Site</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a
            href={`/site/${slug}`}
            className="font-display text-lg font-bold hover:opacity-80 transition-opacity"
          >
            &larr; Back
          </a>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" /> Secure checkout
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Book Your Service
          </h1>
          <p className="mt-2 text-muted-foreground">
            Fill out the form below. You'll pay a 30% deposit to secure your booking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="John Smith"
                  required
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">
                  <MapPin className="mr-1 inline h-4 w-4" />
                  Service address
                </Label>
                <Input
                  id="address"
                  placeholder="123 Main St, City, ST 12345"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="date">
                  <CalendarDays className="mr-1 inline h-4 w-4" />
                  Preferred date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="notes">Additional notes</Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Anything we should know? (e.g. two-story house, steep roof, specific design ideas)"
                  className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Deposit & Book
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> SSL Encrypted
            </span>
            <span>Powered by Stripe</span>
          </div>
        </form>
      </div>
    </div>
  );
}
