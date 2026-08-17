import {
  notFound,
  redirect,
} from "next/navigation";

import TransactionDetails from "@/components/transactions/transaction-details";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    transaction_id: string;
  }>;
};

type RecordValue =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is RecordValue {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export default async function TransactionPage({
  params,
}: PageProps) {
  const {
    transaction_id,
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
    "get_admin_transaction_details",
    {
      p_transaction_id:
        transaction_id,
    }
  );

  if (error) {
    if (
      error.message
        .toLowerCase()
        .includes(
          "transaction not found"
        )
    ) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load transaction:{" "}
          {error.message}
        </div>
      </main>
    );
  }

  if (!isRecord(data)) {
    notFound();
  }

  const transaction =
    isRecord(
      data.transaction
    )
      ? data.transaction
      : null;

  if (!transaction) {
    notFound();
  }

  const member =
    isRecord(data.member)
      ? data.member
      : null;

  const processingStaff =
    isRecord(
      data.processing_staff
    )
      ? data.processing_staff
      : null;

  return (
    <TransactionDetails
      transaction={
        transaction
      }
      member={member}
      processingStaff={
        processingStaff
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