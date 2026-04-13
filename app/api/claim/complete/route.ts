import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// POST: Complete a provider claim — transfers ownership to the authenticated user
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Must be logged in to claim" }, { status: 401 });
  }

  let body: { token: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Look up the claim
  const { data: claim } = await db
    .from("provider_claims")
    .select("id, provider_id, email, expires_at, claimed_at")
    .eq("token", body.token)
    .single();

  if (!claim) {
    return NextResponse.json({ error: "Invalid claim token" }, { status: 404 });
  }

  if (claim.claimed_at) {
    return NextResponse.json(
      { error: "This claim has already been used" },
      { status: 410 }
    );
  }

  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This claim link has expired. Contact your sales rep for a new one." },
      { status: 410 }
    );
  }

  // Verify user's email matches the claim email (case-insensitive)
  if (user.email?.toLowerCase() !== claim.email.toLowerCase()) {
    return NextResponse.json(
      {
        error: `This claim was issued to ${claim.email}. Please sign in with that email address.`,
      },
      { status: 403 }
    );
  }

  // Check the provider still has the placeholder owner
  const PLACEHOLDER_OWNER = "00000000-0000-0000-0000-000000000000";
  const { data: provider } = await db
    .from("providers")
    .select("id, owner_user_id, slug")
    .eq("id", claim.provider_id)
    .single();

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  if (provider.owner_user_id !== PLACEHOLDER_OWNER) {
    return NextResponse.json(
      { error: "This business has already been claimed" },
      { status: 409 }
    );
  }

  // Transfer ownership
  const { error: transferErr } = await db
    .from("providers")
    .update({ owner_user_id: user.id })
    .eq("id", provider.id)
    .eq("owner_user_id", PLACEHOLDER_OWNER);

  if (transferErr) {
    return NextResponse.json(
      { error: `Failed to transfer ownership: ${transferErr.message}` },
      { status: 500 }
    );
  }

  // Mark claim as complete
  await db
    .from("provider_claims")
    .update({
      claimed_at: new Date().toISOString(),
      claimed_by_user_id: user.id,
    })
    .eq("id", claim.id);

  return NextResponse.json({
    success: true,
    provider_id: provider.id,
    slug: provider.slug,
    redirect: "/dashboard",
  });
}
