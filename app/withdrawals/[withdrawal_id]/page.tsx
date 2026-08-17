import {
  notFound,
  redirect,
} from "next/navigation";

import WithdrawalDetails from "@/components/withdrawals/withdrawal-details";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    withdrawal_id: string;
  }>;
};

type RecordValue =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is RecordValue {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function recordArray(
  value: unknown
): RecordValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    isRecord
  );
}

export default async function WithdrawalPage({
  params,
}: PageProps) {
  const {
    withdrawal_id,
  } = await params;

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
    !staff ||
    !staff.is_active
  ) {
    redirect("/");
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_admin_withdrawal_details",
    {
      p_withdrawal_id:
        withdrawal_id,
    }
  );

  if (error) {
    if (
      error.message
        .toLowerCase()
        .includes(
          "withdrawal not found"
        )
    ) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error.message}
        </div>
      </main>
    );
  }

  if (!isRecord(data)) {
    notFound();
  }

  const withdrawal =
    isRecord(
      data.withdrawal
    )
      ? data.withdrawal
      : null;

  if (!withdrawal) {
    notFound();
  }

  return (
    <WithdrawalDetails
      withdrawal={
        withdrawal
      }
      member={
        isRecord(
          data.member
        )
          ? data.member
          : null
      }
      wallet={
        isRecord(
          data.wallet
        )
          ? data.wallet
          : null
      }
      transaction={
        isRecord(
          data.transaction
        )
          ? data.transaction
          : null
      }
      actions={
        recordArray(
          data.actions
        )
      }
      staffName={
        staff.full_name ??
        "Staff"
      }
      staffRole={
        staff.role ?? ""
      }
    />
  );
}