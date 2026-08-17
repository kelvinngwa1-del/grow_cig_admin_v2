import { redirect } from "next/navigation";

import LoansTable from "@/components/loans/loans-table";
import { createClient } from "@/lib/supabase/server";

export default async function LoansPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: staff } = await supabase
    .from("staff_users")
    .select(
      "id, full_name, email, role, is_active"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!staff || !staff.is_active) {
    redirect("/");
  }

  const { data: memberRows } =
    await supabase.rpc(
      "get_admin_member_overview"
    );

  const { data: loans, error } =
    await supabase
      .from("loans")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load loans:{" "}
          {error.message}
        </div>
      </main>
    );
  }

  const memberMap = new Map<
    string,
    {
      full_name: string | null;
      account_number: string | null;
      phone: string | null;
    }
  >();

  for (const member of memberRows ?? []) {
    memberMap.set(
      member.user_id,
      {
        full_name:
          member.full_name ?? null,
        account_number:
          member.account_number ?? null,
        phone:
          member.phone ?? null,
      }
    );
  }

  const enrichedLoans =
    (loans ?? []).map((loan) => {
      const member =
        memberMap.get(
          loan.user_id
        );

      return {
        ...loan,

        member_name:
          member?.full_name ??
          "Member",

        account_number:
          member?.account_number ??
          null,

        member_phone:
          member?.phone ??
          null,
      };
    });

  return (
    <LoansTable
      loans={enrichedLoans}
      staffName={
        staff.full_name
      }
      staffRole={
        staff.role
      }
    />
  );
}