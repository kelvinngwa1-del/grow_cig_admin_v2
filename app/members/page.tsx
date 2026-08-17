import { redirect } from "next/navigation";

import MembersTable from "@/components/members/members-table";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage() {
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
    .select(
      "id, full_name, role, is_active"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    !staff ||
    !staff.is_active
  ) {
    redirect("/");
  }

  const {
    data: members,
    error,
  } = await supabase.rpc(
    "get_admin_member_overview"
  );

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load members:{" "}
          {error.message}
        </div>
      </main>
    );
  }

  return (
    <MembersTable
      members={members ?? []}
      staffName={staff.full_name}
      staffRole={staff.role}
    />
  );
}