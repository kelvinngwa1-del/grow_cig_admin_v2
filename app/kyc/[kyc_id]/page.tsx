import {
  notFound,
  redirect,
} from "next/navigation";

import KycDetails from "@/components/kyc/kyc-details";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    kyc_id: string;
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

export default async function KycDetailsPage({
  params,
}: PageProps) {
  const {
    kyc_id,
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
  // LOAD KYC DETAILS
  // ============================================================

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_admin_kyc_details",
    {
      p_kyc_id:
        kyc_id,
    }
  );

  if (error) {
    if (
      error.message
        .toLowerCase()
        .includes(
          "kyc record not found"
        )
    ) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-slate-50 p-5 md:p-8">

        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6">

          <h1 className="text-lg font-black text-red-800">
            Unable to Load KYC
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error.message}
          </p>

        </div>

      </main>
    );
  }

  // ============================================================
  // VALIDATE RESPONSE
  // ============================================================

  if (!isRecord(data)) {
    notFound();
  }

  const kyc =
    isRecord(
      data.kyc
    )
      ? data.kyc
      : null;

  if (!kyc) {
    notFound();
  }

  const member =
    isRecord(
      data.member
    )
      ? data.member
      : null;

  const reviewer =
    isRecord(
      data.reviewer
    )
      ? data.reviewer
      : null;

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <KycDetails
      kyc={kyc}
      member={member}
      reviewer={reviewer}
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