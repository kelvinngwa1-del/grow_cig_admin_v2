import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import LoanSettingsForm from "@/components/settings/loan-settings-form";

export default async function LoanSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff || !staff.is_active) {
    redirect("/");
  }

  const { data: settings, error } = await supabase
    .from("loan_settings")
    .select(
      `
        id,
        required_savings_percentage,
        monthly_interest_percentage,
        minimum_membership_months,
        maximum_loan_amount,
        allowed_durations,
        installments_count,
        updated_at
      `
    )
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <LoanSettingsForm
      initialSettings={settings}
      staffName={staff.full_name}
      staffRole={staff.role}
    />
  );
}