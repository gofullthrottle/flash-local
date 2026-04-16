export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient, getCurrentUser } from "@/lib/supabase/server";
import { ClaimActions } from "./claim-actions";

type PageProps = { params: Promise<{ token: string }> };

export default async function ClaimPage({ params }: PageProps) {
  const { token } = await params;
  const db = createAdminClient();

  const { data: claim } = await db
    .from("provider_claims")
    .select(
      "id, provider_id, email, expires_at, claimed_at, providers(display_name, slug, vertical_id)"
    )
    .eq("token", token)
    .maybeSingle();

  const user = await getCurrentUser();

  if (!claim) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="mt-2 text-muted-foreground">
          This claim link isn&apos;t recognized. It may have been mistyped.
        </p>
      </div>
    );
  }

  if (claim.claimed_at) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Already Claimed</h1>
        <p className="mt-2 text-muted-foreground">
          This business has already been claimed. If this was you, sign in to
          your dashboard.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const expired = new Date(claim.expires_at) < new Date();
  if (expired) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Link Expired</h1>
        <p className="mt-2 text-muted-foreground">
          This claim link has expired. Contact your FlashLocal sales rep for a
          new one.
        </p>
      </div>
    );
  }

  const provider = Array.isArray(claim.providers)
    ? claim.providers[0]
    : claim.providers;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Claim Your Business Page</h1>
      <p className="mt-2 text-muted-foreground">
        A FlashLocal sales rep set up a bookable business page for you.
      </p>

      <div className="mt-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm">
          <span className="text-muted-foreground">Business:</span>{" "}
          <span className="font-medium">{provider?.display_name}</span>
        </p>
        <p className="mt-1 text-sm">
          <span className="text-muted-foreground">Site:</span>{" "}
          <span className="font-mono text-xs">
            {provider?.slug}.flashlocal.com
          </span>
        </p>
        <p className="mt-1 text-sm">
          <span className="text-muted-foreground">Claim email:</span>{" "}
          <span className="font-medium">{claim.email}</span>
        </p>
      </div>

      <div className="mt-6">
        <ClaimActions
          token={token}
          claimEmail={claim.email}
          currentUserEmail={user?.email ?? null}
        />
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        By claiming, you become the owner of this business page. You can
        customize, publish, and start accepting bookings.
      </p>
    </div>
  );
}
