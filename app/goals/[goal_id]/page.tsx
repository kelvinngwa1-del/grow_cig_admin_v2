import {
  notFound,
  redirect,
} from "next/navigation";

import GoalDetails from "@/components/goals/goal-details";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    goal_id: string;
  }>;
};

type JsonRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function recordArray(
  value: unknown
): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

export default async function GoalPage({
  params,
}: PageProps) {
  const {
    goal_id,
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
    .from("staff_users")
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
  // SECURE GOAL DETAILS
  // ============================================================

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_admin_goal_details",
    {
      p_goal_id:
        goal_id,
    }
  );

  if (error) {
    if (
      error.message
        .toLowerCase()
        .includes(
          "goal not found"
        )
    ) {
      notFound();
    }

    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load Goal:{" "}
          {error.message}
        </div>
      </main>
    );
  }

  if (!isRecord(data)) {
    notFound();
  }

  const goal =
    isRecord(data.goal)
      ? data.goal
      : null;

  if (!goal) {
    notFound();
  }

  const member =
    isRecord(data.member)
      ? data.member
      : null;

  const transactions =
    recordArray(
      data.transactions
    );

  return (
    <GoalDetails
      goal={goal}
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