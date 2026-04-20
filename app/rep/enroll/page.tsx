"use client";

import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { useGeolocation } from "@/lib/hooks/use-geolocation";

const VERTICALS = [
  { id: "garage-declutter", label: "Garage Decluttering" },
  { id: "estate-cleanout", label: "Estate Cleanout" },
  { id: "pressure-wash", label: "Pressure Washing" },
  { id: "holiday-lights", label: "Holiday Lights" },
  { id: "closet-org", label: "Home Organization" },
  { id: "fence-stain", label: "Fence Staining" },
  { id: "gutter-clean", label: "Gutter Cleaning" },
  { id: "window-clean", label: "Window Cleaning" },
  { id: "pool-open-close", label: "Pool Service" },
  { id: "snow-shoveling", label: "Snow Removal" },
  { id: "mobile-detail", label: "Auto Detailing" },
  { id: "handyman", label: "Handyman" },
  { id: "dog-waste", label: "Dog Waste Removal" },
  { id: "dryer-vent", label: "Dryer Vent Cleaning" },
  { id: "mosquito-treat", label: "Pest Treatment" },
  { id: "meal-prep", label: "Meal Prep" },
  { id: "errand-concierge", label: "Errand Concierge" },
  { id: "party-setup", label: "Party Setup" },
  { id: "junk-haul", label: "Junk Hauling" },
  { id: "pet-portrait", label: "Pet Photography" },
];

const PLANS = [
  {
    id: "REV_SHARE",
    label: "Rev-Share (Partner)",
    description: "$0 upfront — platform takes 15% of bookings",
    recommended: true,
  },
  {
    id: "UPFRONT",
    label: "Upfront",
    description: "One-time setup fee — provider keeps 100%",
    recommended: false,
  },
];

const TIERS = [
  {
    id: "STARTER",
    label: "Starter",
    price: "Free",
    description: "Microsite, booking, 3 packages, reviews",
  },
  {
    id: "PRO",
    label: "Pro",
    price: "$29/mo",
    description: "Unlimited packages, custom domain, GBP setup, priority support",
    commission: "$25 signup bonus + 12% ongoing",
  },
  {
    id: "PREMIUM",
    label: "Premium",
    price: "$79/mo",
    description: "Everything + automated ads, analytics, API, dedicated onboarding",
    commission: "$50 signup bonus + 10% ongoing",
  },
];

export default function EnrollPage() {
  const { position, getCurrentPosition } = useGeolocation();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollResult, setEnrollResult] = useState<{
    provider_id: string;
    slug: string;
    claim_url: string;
  } | null>(null);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [verticalId, setVerticalId] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [plan, setPlan] = useState("REV_SHARE");
  const [tier, setTier] = useState("STARTER");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    let lat = position?.lat;
    let lng = position?.lng;
    if (!lat || !lng) {
      try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lng = pos.lng;
      } catch {
        // Non-fatal
      }
    }

    try {
      const res = await fetch("/api/rep/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName.trim(),
          owner_name: ownerName.trim(),
          owner_email: ownerEmail.trim(),
          owner_phone: ownerPhone.trim() || undefined,
          vertical_id: verticalId,
          service_area: serviceArea.trim(),
          plan,
          tier,
          captured_lat: lat,
          captured_lng: lng,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Enrollment failed");
      }

      const data = await res.json();
      setEnrollResult(data);
      setStep(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (step === 4 && enrollResult) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Business Enrolled!</h2>
        <p className="mt-2 text-muted-foreground">
          {businessName} has been set up. The owner will receive an email to
          claim their account.
        </p>
        <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm">
          <p>
            <span className="font-medium">Site URL:</span>{" "}
            {enrollResult.slug}.flashlocal.com
          </p>
          <p className="mt-1">
            <span className="font-medium">Tier:</span> {tier}
          </p>
        </div>
        <button
          onClick={() => {
            setStep(1);
            setBusinessName("");
            setOwnerName("");
            setOwnerEmail("");
            setOwnerPhone("");
            setVerticalId("");
            setServiceArea("");
            setPlan("REV_SHARE");
            setTier("STARTER");
            setEnrollResult(null);
          }}
          className="mt-6 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground"
        >
          Enroll Another
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Enroll a Business</h2>
        <p className="text-muted-foreground">
          Sign up a local business on the spot. They&apos;ll get an email to
          claim ownership.
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Step 1: Business basics */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Business Details</h3>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name *"
            required
            autoFocus
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Owner's name *"
            required
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="Owner's email *"
            required
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="Owner's phone (optional)"
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={verticalId}
            onChange={(e) => setVerticalId(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-3 text-base text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select service type...</option>
            {VERTICALS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            placeholder="Service area (e.g., Austin, TX)"
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => setStep(2)}
            disabled={!businessName.trim() || !ownerName.trim() || !ownerEmail.trim()}
            className="w-full rounded-lg bg-primary py-3.5 text-base font-semibold text-primary-foreground disabled:opacity-50"
          >
            Next: Choose Plan
          </button>
        </div>
      )}

      {/* Step 2: Plan & Tier */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Payment Model</h3>
          <div className="space-y-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  plan === p.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.label}</p>
                  {p.recommended && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.description}
                </p>
              </button>
            ))}
          </div>

          <h3 className="pt-2 text-lg font-semibold">Feature Tier</h3>
          <div className="space-y-3">
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.id)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  tier === t.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {t.label} — {t.price}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.description}
                </p>
                {t.commission && (
                  <p className="mt-1 text-xs font-medium text-green-600">
                    Your commission: {t.commission}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border bg-background py-3 font-medium"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg bg-primary py-3 font-semibold text-primary-foreground"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Review & Submit</h3>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <Row label="Business" value={businessName} />
            <Row label="Owner" value={`${ownerName} (${ownerEmail})`} />
            {ownerPhone && <Row label="Phone" value={ownerPhone} />}
            {verticalId && <Row label="Service" value={verticalId.replace(/-/g, " ")} />}
            {serviceArea && <Row label="Area" value={serviceArea} />}
            <Row label="Payment model" value={plan === "REV_SHARE" ? "Rev-Share (Partner)" : "Upfront"} />
            <Row label="Tier" value={tier} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border bg-background py-3 font-medium"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Enrolling..." : "Enroll Business"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
