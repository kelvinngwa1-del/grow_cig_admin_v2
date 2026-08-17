import {
  notFound,
  redirect,
} from "next/navigation";

import MemberTransactionStatement from "@/components/transactions/member-transaction-statement";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    user_id: string;
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

export default async function MemberTransactionStatementPage({
  params,
}: PageProps) {
  const {
    user_id,
  } = await params;

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
  // STAFF
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
  // MEMBER TRANSACTION STATEMENT
  // ============================================================

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_admin_member_transaction_statement",
    {
      p_user_id:
        user_id,
    }
  );

  if (error) {
    if (
      error.message
        .toLowerCase()
        .includes(
          "member not found"
        )
    ) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-slate-50 p-5 md:p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6">

          <h1 className="text-lg font-black text-red-800">
            Unable to Load Member Statement
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error.message}
          </p>

        </div>
      </main>
    );
  }

  if (!isRecord(data)) {
    notFound();
  }

  const member =
    isRecord(
      data.member
    )
      ? data.member
      : null;

  if (!member) {
    notFound();
  }

  const transactions =
    recordArray(
      data.transactions
    );

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <MemberTransactionStatement
      member={member}
      transactions={
        transactions
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