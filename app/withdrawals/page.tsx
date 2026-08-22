import { redirect } from "next/navigation";

import WithdrawalsTable from "@/components/withdrawals/withdrawals-table";
import { createClient } from "@/lib/supabase/server";

export default async function WithdrawalsPage() {
  const supabase =
    await createClient();

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // ============================================================
  // STAFF ACCOUNT
  // ============================================================

  const {
    data: staff,
    error: staffError,
  } = await supabase
    .from("staff_users")
    .select(`
      id,
      full_name,
      email,
      role,
      is_active
    `)
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    staffError ||
    !staff ||
    !staff.is_active
  ) {
    redirect("/");
  }

  // ============================================================
  // LOAD WITHDRAWALS
  // ============================================================

  const {
    data: withdrawals,
    error: withdrawalsError,
  } = await supabase.rpc(
    "get_admin_withdrawals_v2"
  );

  if (withdrawalsError) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 md:p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-black text-red-800">
            Unable to Load Withdrawals
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {withdrawalsError.message}
          </p>
        </div>
      </main>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <WithdrawalsTable
      withdrawals={
        withdrawals ?? []
      }
      staffName={
        staff.full_name ??
        "Staff"
      }
      staffRole={
        staff.role ??
        ""
      }
    />
  );
}