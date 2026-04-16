import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { sendClaimInvitation } from "@/lib/email/send";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Nil UUID used as placeholder for unclaimed providers
const PLACEHOLDER_OWNER = "00000000-0000-0000-0000-000000000000";

type EnrollRequest = {
  business_name: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  vertical_id?: string;
  service_area?: string;
  plan: "UPFRONT" | "REV_SHARE";
  tier: "STARTER" | "PRO" | "PREMIUM";
  captured_lat?: number;
  captured_lng?: number;
};

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  // Verify the user is a sales rep
  const { data: rep } = await db
    .from("sales_reps")
    .select("id, referral_code, display_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!rep) {
    return NextResponse.json({ error: "Not a sales rep" }, { status: 403 });
  }

  let body: EnrollRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.business_name?.trim() || !body.owner_name?.trim() || !body.owner_email?.trim()) {
    return NextResponse.json(
      { error: "business_name, owner_name, and owner_email are required" },
      { status: 400 }
    );
  }

  const slug = slugify(body.business_name);

  // Check slug availability
  const { data: slugExists } = await db
    .from("providers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugExists) {
    return NextResponse.json(
      { error: "This business URL is already taken. Try a different name." },
      { status: 409 }
    );
  }

  // Create provider with placeholder owner (will be claimed by business owner later)
  const { data: provider, error: providerErr } = await db
    .from("providers")
    .insert({
      status: "PENDING",
      plan: body.plan || "REV_SHARE",
      tier: body.tier || "STARTER",
      vertical_id: body.vertical_id || "other",
      slug,
      display_name: body.business_name.trim(),
      owner_user_id: PLACEHOLDER_OWNER,
      referred_by_rep_id: rep.id,
      referral_code_used: rep.referral_code,
    })
    .select("id")
    .single();

  if (providerErr) {
    return NextResponse.json(
      { error: `Failed to create provider: ${providerErr.message}` },
      { status: 500 }
    );
  }

  const providerId = provider.id;

  // Create supporting records
  const ops = [
    db.from("provider_public_profiles").insert({
      provider_id: providerId,
      headline: `Professional ${(body.vertical_id || "local").replace(/-/g, " ")} services`,
      service_area: { raw: body.service_area || "" },
      timezone: "America/Los_Angeles",
    }),
    db.from("provider_contacts").insert({
      provider_id: providerId,
      email: body.owner_email.trim(),
      phone: body.owner_phone?.trim() || "",
    }),
    db.from("sites").insert({
      provider_id: providerId,
      subdomain: slug,
      theme_id: "default",
      is_live: false,
    }),
    db.from("ads_settings").insert({
      provider_id: providerId,
    }),
    db.from("gbp_profiles").insert({
      provider_id: providerId,
    }),
  ];

  const results = await Promise.all(ops);
  const failed = results.find((r: { error: unknown }) => r.error);
  if (failed?.error) {
    return NextResponse.json(
      { error: `Setup failed: ${failed.error.message}` },
      { status: 500 }
    );
  }

  // Update rep stats atomically via RPC (avoids read-modify-write race)
  await db.rpc("increment_rep_signups", { rep_id_param: rep.id }).then(() => {}).catch(() => {
    // Non-fatal — counter will drift but enrollment succeeded
  });

  // If the business was captured from a prospect, link it
  if (body.captured_lat != null && body.captured_lng != null) {
    // Look for a matching prospect by business name + rep
    const { data: prospect } = await db
      .from("prospects")
      .select("id")
      .eq("rep_id", rep.id)
      .ilike("business_name", body.business_name.trim())
      .neq("status", "CONVERTED")
      .maybeSingle();

    if (prospect) {
      await db
        .from("prospects")
        .update({
          status: "CONVERTED",
          became_provider_id: providerId,
          converted_at: new Date().toISOString(),
        })
        .eq("id", prospect.id);
    }
  }

  // Create a claim record with a signed token
  const { data: claim, error: claimErr } = await db
    .from("provider_claims")
    .insert({
      provider_id: providerId,
      email: body.owner_email.trim(),
      enrolled_by_rep_id: rep.id,
    })
    .select("token, expires_at")
    .single();

  if (claimErr || !claim) {
    // Non-fatal: provider was created. Surface but don't roll back.
    return NextResponse.json(
      {
        provider_id: providerId,
        slug,
        warning: "Provider created but claim token failed",
      },
      { status: 201 }
    );
  }

  // Send claim invitation email
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://flashlocal.com";
  const claimUrl = `${origin}/claim/${claim.token}`;

  try {
    const emailResult = await sendClaimInvitation({
      to: body.owner_email.trim(),
      businessName: body.business_name.trim(),
      ownerName: body.owner_name.trim(),
      repName: rep.display_name,
      claimUrl,
      expiresInDays: 30,
    });

    if (emailResult.sent) {
      await db
        .from("provider_claims")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("token", claim.token);
    }
  } catch {
    // Non-fatal — claim token is still valid, rep can resend
  }

  return NextResponse.json(
    {
      provider_id: providerId,
      slug,
      claim_url: claimUrl,
      claim_token: claim.token,
      expires_at: claim.expires_at,
    },
    { status: 201 }
  );
}
