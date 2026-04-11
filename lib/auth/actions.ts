"use server";

import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function getProviderForUser(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("providers")
    .select("id, slug, display_name, status, plan, vertical_id")
    .eq("owner_user_id", userId)
    .single();
  return data;
}
