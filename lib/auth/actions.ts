"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { createBrowserClient } from "@/lib/supabase/client";

export async function signUp(email: string, password: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return { error: error.message };
  return { userId: data.user.id };
}

export async function getSession() {
  const supabase = createAdminClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
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
