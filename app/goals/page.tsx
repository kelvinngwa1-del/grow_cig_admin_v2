import { redirect } from "next/navigation";

import GoalsTable from "@/components/goals/goals-table";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsPage() {
  const supabase =
    await createClient();

  // ============================================================
  // AUTH
  // ============================================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // ============================================================
  // STAFF
  // ============================================================

  const {
    data: staff,
  } = await supabase
    .from("staff_users")
    .select(
      "id, full_name, role, is_active"
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    !staff ||
    !staff.is_active
  ) {
    redirect("/");
  }

  // ============================================================
  // SECURE ADMIN GOALS RPC
  // ============================================================

  const {
    data: goals,
    error,
  } = await supabase.rpc(
    "get_admin_goals"
  );

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load Goals:{" "}
          {error.message}
        </div>
      </main>
    );
  }

  return (
    <GoalsTable
      goals={
        goals ?? []
      }
      staffName={
        staff.full_name ??
        "Staff"
      }
      staffRole={
        staff.role
      }
    />
  );
}