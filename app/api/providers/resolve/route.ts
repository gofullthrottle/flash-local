import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET /api/providers/resolve?slug=xxx — resolve provider_id from slug
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: provider, error } = await db
    .from("providers")
    .select("id, display_name, slug, status, plan")
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .single();

  if (error || !provider) {
    return NextResponse.json(
      { error: "Provider not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    provider_id: provider.id,
    display_name: provider.display_name,
    slug: provider.slug,
    plan: provider.plan,
  });
}
