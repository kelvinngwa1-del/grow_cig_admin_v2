import {
  notFound,
  redirect,
} from "next/navigation";

import MemberProfile from "@/components/members/member-profile";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    user_id: string;
  }>;
};

type RecordRow =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is RecordRow {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function recordArray(
  value: unknown
): RecordRow[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value.filter(
    isRecord
  );
}

export default async function MemberPage({
  params,
}: PageProps) {
  const {
    user_id,
  } = await params;

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
    .from(
      "staff_users"
    )
    .select(
      `
      id,
      full_name,
      email,
      role,
      is_active
      `
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
  // MEMBER OVERVIEW
  // ============================================================

  const {
    data:
      memberRows,
    error:
      memberError,
  } = await supabase.rpc(
    "get_admin_member_overview"
  );

  if (memberError) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">

        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">

          Unable to load
          member:{" "}
          {
            memberError.message
          }

        </div>

      </main>
    );
  }

  const member =
    (
      memberRows ?? []
    ).find(
      (
        item: {
          user_id?:
            string;
        }
      ) =>
        item.user_id ===
        user_id
    );

  if (!member) {
    notFound();
  }

  // ============================================================
  // SECURE MEMBER RECORDS
  //
  // This RPC loads records through the Admin backend
  // so RLS does not hide them from the Admin dashboard.
  //
  // It returns:
  // Goals
  // Transactions
  // Withdrawals
  // Loans
  // Repayments
  // Referrals
  // KYC
  // ============================================================

  const {
    data:
      recordsData,
    error:
      recordsError,
  } = await supabase.rpc(
    "get_admin_member_records",
    {
      p_user_id:
        user_id,
    }
  );

  if (recordsError) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">

        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">

          Unable to load
          member records:{" "}
          {
            recordsError.message
          }

        </div>

      </main>
    );
  }

  // ============================================================
  // NORMALIZE RPC RESULT
  // ============================================================

  const records =
    isRecord(
      recordsData
    )
      ? recordsData
      : {};

  const goals =
    recordArray(
      records.goals
    );

  const transactions =
    recordArray(
      records.transactions
    );

  const withdrawals =
    recordArray(
      records.withdrawals
    );

  const loans =
    recordArray(
      records.loans
    );

  const repayments =
    recordArray(
      records.repayments
    );

  const referrals =
    recordArray(
      records.referrals
    );

  const kyc =
    isRecord(
      records.kyc
    )
      ? records.kyc
      : null;

  // ============================================================
  // MEMBER PROFILE
  // ============================================================
  // ============================================================
  // REGISTRATION FEE
  // ============================================================

  const {
    data: registrationData,
    error: registrationError,
  } = await supabase
    .from("profiles")
    .select(
      "registration_fee_due, registration_fee_paid"
    )
    .eq(
      "id",
      user_id
    )
    .maybeSingle();

  if (registrationError) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load registration information:{" "}
          {registrationError.message}
        </div>
      </main>
    );
  }

  const memberWithRegistration = {
    ...member,

    registration_fee_due:
      registrationData?.registration_fee_due ??
      6000,

    registration_fee_paid:
      registrationData?.registration_fee_paid ??
      0,
  };


  return (
    <MemberProfile
      member={memberWithRegistration}

      goals={
        goals
      }

      transactions={
        transactions
      }

      withdrawals={
        withdrawals
      }

      loans={
        loans
      }

      repayments={
        repayments
      }

      referrals={
        referrals
      }

      kyc={
        kyc
      }

      staff={{
        full_name:
          staff.full_name ??
          "Staff",

        email:
          staff.email ??
          "",

        role:
          staff.role,
      }}
    />
  );
}