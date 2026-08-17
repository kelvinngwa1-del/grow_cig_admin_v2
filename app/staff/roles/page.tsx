import { redirect } from "next/navigation";

import StaffAccessManager from "@/components/staff/role-builder";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;

function isRecord(
  value: unknown
): value is Row {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function recordArray(
  value: unknown
): Row[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

export default async function StaffAccessPage() {
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
  // CHECK STAFF MANAGEMENT PERMISSION
  // ============================================================

  const {
    data: allowed,
    error: permissionError,
  } = await supabase.rpc(
    "staff_has_permission",
    {
      p_permission_key:
        "staff.manage",
    }
  );

  if (
    permissionError ||
    !allowed
  ) {
    redirect("/");
  }

  // ============================================================
  // LOAD STAFF PERMISSION MANAGER
  // ============================================================

  const {
    data: manager,
    error: managerError,
  } = await supabase.rpc(
    "get_admin_staff_permission_manager"
  );

  if (managerError) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 md:p-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-6">

          <h1 className="text-lg font-black text-red-800">
            Unable to Load Staff Access
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {managerError.message}
          </p>

        </div>
      </main>
    );
  }

  // ============================================================
  // LOAD MEMBERS
  // ============================================================

  const {
    data: members,
    error: membersError,
  } = await supabase.rpc(
    "get_admin_member_overview"
  );

  if (membersError) {
    return (
      <main className="min-h-screen bg-slate-50 p-5 md:p-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-6">

          <h1 className="text-lg font-black text-red-800">
            Unable to Load Members
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {membersError.message}
          </p>

        </div>
      </main>
    );
  }

  // ============================================================
  // NORMALIZE MANAGER RESPONSE
  // ============================================================

  const managerData =
    isRecord(manager)
      ? manager
      : {};

  const permissions =
    recordArray(
      managerData.permissions
    );

  const staff =
    recordArray(
      managerData.staff
    );

  const normalizedMembers =
    Array.isArray(members)
      ? members.filter(
          isRecord
        )
      : [];

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <StaffAccessManager
      permissions={
        permissions
      }
      staff={
        staff
      }
      members={
        normalizedMembers
      }
      currentUserId={
        user.id
      }
    />
  );
}