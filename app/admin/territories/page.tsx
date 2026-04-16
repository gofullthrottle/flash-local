export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { TerritoryManager } from "./territory-manager";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createServerClient();
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/");
}

export default async function AdminTerritoriesPage() {
  await requireAdminUser();

  const supabase = createServerClient();

  const [{ data: territories }, { data: reps }] = await Promise.all([
    supabase
      .from("rep_territories")
      .select("id, rep_id, postal_code, city, region, sales_reps(display_name, email)")
      .order("postal_code"),
    supabase
      .from("sales_reps")
      .select("id, display_name, email")
      .eq("is_active", true)
      .order("display_name"),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Territory Management</h1>
        <p className="text-muted-foreground">
          Assign postal codes to sales reps. Each postal code can only belong to
          one rep at a time.
        </p>
      </div>

      <TerritoryManager
        initialTerritories={territories ?? []}
        reps={reps ?? []}
      />
    </div>
  );
}
