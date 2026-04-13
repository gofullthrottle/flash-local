"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  token: string;
  claimEmail: string;
  currentUserEmail: string | null;
};

export function ClaimActions({ token, claimEmail, currentUserEmail }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailsMatch =
    currentUserEmail?.toLowerCase() === claimEmail.toLowerCase();

  const handleClaim = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/claim/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Claim failed");
      }

      const data = await res.json();
      router.push(data.redirect ?? "/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUserEmail) {
    // Not signed in — route them to signup/login with the claim email pre-filled
    const signupUrl = `/signup?email=${encodeURIComponent(claimEmail)}&redirect=${encodeURIComponent(
      `/claim/${token}`
    )}`;
    const loginUrl = `/login?email=${encodeURIComponent(claimEmail)}&redirect=${encodeURIComponent(
      `/claim/${token}`
    )}`;

    return (
      <div className="space-y-3">
        <Link
          href={signupUrl}
          className="block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground"
        >
          Create Account & Claim
        </Link>
        <Link
          href={loginUrl}
          className="block w-full rounded-lg border bg-background py-3 text-center font-medium"
        >
          I already have an account
        </Link>
      </div>
    );
  }

  if (!emailsMatch) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          You&apos;re signed in as <strong>{currentUserEmail}</strong>, but this
          claim was issued to <strong>{claimEmail}</strong>. Please sign out and
          sign in with the correct email.
        </div>
        <Link
          href="/login"
          className="block w-full rounded-lg border bg-background py-3 text-center font-medium"
        >
          Switch Account
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        onClick={handleClaim}
        disabled={submitting}
        className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Claiming..." : "Claim My Business Page"}
      </button>
    </div>
  );
}
