"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RepJoinPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/rep/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      router.push("/rep");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Join the Sales Team</h1>
        <p className="mt-2 text-muted-foreground">
          Become a FlashLocal sales rep. Sign up local businesses, earn
          commissions on every upgrade.
        </p>
      </div>

      {/* Value prop */}
      <div className="my-8 space-y-3">
        <BenefitItem title="Earn per signup">
          $25-$50 bonus when a business upgrades to Pro or Premium
        </BenefitItem>
        <BenefitItem title="Ongoing revenue share">
          10-15% of platform fees from businesses you refer
        </BenefitItem>
        <BenefitItem title="Built for the field">
          PWA with GPS tracking, offline prospect capture, one-tap enrollment
        </BenefitItem>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <button
          type="submit"
          disabled={submitting || !displayName.trim() || !email.trim()}
          className="w-full rounded-lg bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Creating your account..." : "Become a Rep"}
        </button>
      </form>
    </div>
  );
}

function BenefitItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
