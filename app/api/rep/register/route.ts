import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { display_name: string; email: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.display_name?.trim() || !body.email?.trim()) {
    return NextResponse.json(
      { error: "display_name and email are required" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // Check if already registered
  const { data: existing } = await db
    .from("sales_reps")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ rep_id: existing.id });
  }

  // Generate a unique referral code
  const baseCode = `rep-${slugify(body.display_name)}`;
  let referralCode = baseCode;
  let attempt = 0;

  while (attempt < 10) {
    const { data: codeExists } = await db
      .from("sales_reps")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (!codeExists) break;
    attempt++;
    referralCode = `${baseCode}-${attempt}`;
  }

  const { data: rep, error } = await db
    .from("sales_reps")
    .insert({
      user_id: user.id,
      display_name: body.display_name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim() || null,
      referral_code: referralCode,
    })
    .select("id, referral_code")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rep_id: rep.id, referral_code: rep.referral_code }, { status: 201 });
}
