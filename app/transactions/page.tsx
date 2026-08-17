import { redirect } from "next/navigation";

import TransactionsTable from "@/components/transactions/transactions-table";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
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
    .eq("id", user.id)
    .maybeSingle();

  if (
    staffError ||
    !staff ||
    !staff.is_active
  ) {
    redirect("/");
  }

  // ============================================================
  // TRANSACTIONS
  // ============================================================

  const {
    data: transactions,
    error,
  } = await supabase.rpc(
    "get_admin_transactions"
  );

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 md:p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-black text-red-800">
            Unable to Load Transactions
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <TransactionsTable
      transactions={
        transactions ?? []
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