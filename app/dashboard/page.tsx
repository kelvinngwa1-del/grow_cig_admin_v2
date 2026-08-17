import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
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
    error,
  } = await supabase
    .from("staff_users")
    .select(
      "full_name, email, role, is_active"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    error ||
    !staff ||
    !staff.is_active
  ) {
    redirect("/");
  }

  return (
    <AdminShell
      staff={{
        full_name: staff.full_name,
        email: staff.email,
        role: staff.role,
      }}
    />
  );
}
