import { redirect } from "next/navigation";

import ReferralsTable from "@/components/referrals/referrals-table";
import { createClient } from "@/lib/supabase/server";

export default async function ReferralsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

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

  const {
    data: referrals,
    error,
  } = await supabase.rpc(
    "get_admin_referrals"
  );

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 md:p-8">

        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6">

          <h1 className="text-lg font-black text-red-800">
            Unable to Load Referrals
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error.message}
          </p>

        </div>

      </main>
    );
  }

  return (
    <ReferralsTable
      referrals={
        referrals ?? []
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