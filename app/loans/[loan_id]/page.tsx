import { notFound, redirect } from "next/navigation";

import LoanDetails from "@/components/loans/loan-details";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    loan_id: string;
  }>;
};

export default async function LoanDetailsPage({
  params,
}: Props) {
  const { loan_id } = await params;

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

  const { data: loan } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loan_id)
    .maybeSingle();

  if (!loan) {
    notFound();
  }

  const { data: memberRows } =
    await supabase.rpc(
      "get_admin_member_overview"
    );

  const member = (memberRows ?? []).find(
    (item: {
      user_id?: string;
    }) =>
      item.user_id === loan.user_id
  );

  const { data: repayments } =
    await supabase
      .from("loan_repayments")
      .select("*")
      .eq("loan_id", loan_id)
      .order("created_at", {
        ascending: false,
      });

  const confirmedPaid = (
    repayments ?? []
  )
    .filter(
      (item) =>
        item.status
          ?.toLowerCase() ===
        "confirmed"
    )
    .reduce(
      (total, item) =>
        total +
        Number(item.amount ?? 0),
      0
    );

  return (
    <LoanDetails
      loan={loan}
      member={
        member ?? {
          user_id:
            loan.user_id,
          full_name:
            "Member",
          account_number:
            null,
          phone: null,
          goal_savings: 0,
        }
      }
      repayments={
        repayments ?? []
      }
      confirmedPaid={
        confirmedPaid
      }
      staff={{
        full_name:
          staff.full_name,
        role:
          staff.role,
      }}
    />
  );
}