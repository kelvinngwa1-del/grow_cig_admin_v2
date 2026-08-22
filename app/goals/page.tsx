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
  // GOALS
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

  // ============================================================
  // GOAL MANAGEMENT PERMISSION
  // ============================================================

  const {
    data: canManageGoals,
  } = await supabase.rpc(
    "staff_has_permission",
    {
      p_permission_key:
        "goals.manage",
    }
  );

  // ============================================================
  // MEMBER OPTIONS
  // ============================================================

  let members:
    | {
        user_id: string;
        full_name: string | null;
        account_number:
          | string
          | null;
        phone: string | null;
        email: string | null;
      }[]
    = [];

  if (
    canManageGoals === true
  ) {
    const {
      data: memberOptions,
      error: memberError,
    } = await supabase.rpc(
      "get_admin_goal_member_options"
    );

    if (!memberError) {
      members =
        memberOptions ?? [];
    }
  }

  return (
    <GoalsTable
      goals={
        goals ?? []
      }
      members={
        members
      }
      canManageGoals={
        canManageGoals ===
        true
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