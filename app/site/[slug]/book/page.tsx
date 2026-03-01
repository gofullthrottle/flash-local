"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Loader2, MapPin } from "lucide-react";
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
  const [submitted, setSubmitted] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // In production, this would:
      // 1. Create a lead + booking via API
      // 2. Call /api/checkout/create to get a Stripe Checkout URL
      // 3. Redirect customer to pay

      // For now, show a success state
      setSubmitted(true);
    } catch {
      // Error handling
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              Booking request sent!
            </CardTitle>
            <CardDescription>
              We'll confirm your appointment shortly via email and text.
              {checkoutUrl && " You'll be redirected to pay your deposit."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Date:</strong> {form.date || "Flexible"}
              </p>
              <p>
                <strong>Address:</strong> {form.address}
              </p>
            </div>
            <Button className="mt-6" asChild>
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
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <a
            href={`/site/${slug}`}
            className="font-display text-lg font-bold"
          >
            &larr; Back
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Book Your Service</h1>
        <p className="mt-2 text-muted-foreground">
          Fill out the form below and we'll get back to you within the hour.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  className="mt-1"
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
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
                  className="mt-1"
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
                  className="mt-1"
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
                  className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Request Booking <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            You won't be charged until your booking is confirmed. Secure
            payments powered by Stripe.
          </p>
        </form>
      </div>
    </div>
  );
}
