"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  Loader2,
  Save,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type LoanSettings = {
  id: number;
  required_savings_percentage: number;
  monthly_interest_percentage: number;
  minimum_membership_months: number;
  maximum_loan_amount: number;
  allowed_durations: number[];
  installments_count: number;
  updated_at: string;
};

type Props = {
  initialSettings: LoanSettings;
  staffName: string;
  staffRole: string;
};

export default function LoanSettingsForm({
  initialSettings,
  staffName,
  staffRole,
}: Props) {
  const supabase = createClient();

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [
    savingsPercentage,
    setSavingsPercentage,
  ] = useState(
    initialSettings.required_savings_percentage
  );

  const [
    interestPercentage,
    setInterestPercentage,
  ] = useState(
    initialSettings.monthly_interest_percentage
  );

  const [
    membershipMonths,
    setMembershipMonths,
  ] = useState(
    initialSettings.minimum_membership_months
  );

  const [
    maximumLoanAmount,
    setMaximumLoanAmount,
  ] = useState(
    initialSettings.maximum_loan_amount
  );

  const [
    installmentsCount,
    setInstallmentsCount,
  ] = useState(
    initialSettings.installments_count
  );

  const [
    allowedDurations,
    setAllowedDurations,
  ] = useState<number[]>(
    initialSettings.allowed_durations ?? [
      3,
      6,
      9,
      12,
    ]
  );

  function toggleDuration(
    months: number
  ) {
    setAllowedDurations((current) => {
      if (current.includes(months)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter(
          (value) => value !== months
        );
      }

      return [
        ...current,
        months,
      ].sort(
        (a, b) => a - b
      );
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setMessage("");
    setError("");

    if (
      savingsPercentage < 0 ||
      savingsPercentage > 100
    ) {
      setError(
        "Required savings percentage must be between 0 and 100."
      );
      return;
    }

    if (interestPercentage < 0) {
      setError(
        "Interest percentage cannot be negative."
      );
      return;
    }

    if (membershipMonths < 0) {
      setError(
        "Minimum membership months cannot be negative."
      );
      return;
    }

    if (maximumLoanAmount <= 0) {
      setError(
        "Maximum loan amount must be greater than zero."
      );
      return;
    }

    if (installmentsCount <= 0) {
      setError(
        "Installments count must be greater than zero."
      );
      return;
    }

    if (
      allowedDurations.length === 0
    ) {
      setError(
        "Select at least one repayment duration."
      );
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } =
        await supabase
          .from("loan_settings")
          .update({
            required_savings_percentage:
              savingsPercentage,

            monthly_interest_percentage:
              interestPercentage,

            minimum_membership_months:
              membershipMonths,

            maximum_loan_amount:
              maximumLoanAmount,

            allowed_durations:
              allowedDurations,

            installments_count:
              installmentsCount,

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", 1);

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "Loan settings updated successfully."
      );
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : "Unable to update loan settings.";

      setError(text);
    } finally {
      setSaving(false);
    }
  }

  const roleLabel =
    staffRole
      .replaceAll("_", " ")
      .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <p className="text-sm font-bold text-blue-700">
              GROW CIG ADMIN V2
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Loan Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Control the rules used by
              member loan applications.
              Changes here can be read by
              the mobile app immediately.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-400">
              Signed in as
            </p>

            <p className="mt-1 text-sm font-black text-slate-950">
              {staffName}
            </p>

            <p className="mt-1 text-xs font-bold text-blue-700">
              {roleLabel}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-7 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Settings size={22} />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Eligibility Rules
                </h2>

                <p className="text-sm text-slate-500">
                  These rules determine
                  whether a member can
                  submit a loan request.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Required Savings (%)
                </label>

                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={savingsPercentage}
                  onChange={(event) =>
                    setSavingsPercentage(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Example: 35 means the
                  member must have saved
                  35% of the requested
                  loan amount.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Minimum Membership
                  (Months)
                </label>

                <input
                  type="number"
                  min={0}
                  step={1}
                  value={membershipMonths}
                  onChange={(event) =>
                    setMembershipMonths(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Members younger than
                  this cannot apply from
                  the mobile app.
                </p>
              </div>

            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-7 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Loan Terms
                </h2>

                <p className="text-sm text-slate-500">
                  Financial limits and
                  repayment structure.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Monthly Interest (%)
                </label>

                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={interestPercentage}
                  onChange={(event) =>
                    setInterestPercentage(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Maximum Loan Amount
                  (CFA)
                </label>

                <input
                  type="number"
                  min={1}
                  step={1}
                  value={maximumLoanAmount}
                  onChange={(event) =>
                    setMaximumLoanAmount(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Number of Installments
                </label>

                <input
                  type="number"
                  min={1}
                  step={1}
                  value={installmentsCount}
                  onChange={(event) =>
                    setInstallmentsCount(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>

            </div>

            <div className="mt-7">
              <p className="mb-3 text-sm font-bold text-slate-700">
                Allowed Repayment
                Duration (Months)
              </p>

              <div className="flex flex-wrap gap-3">

                {[3, 6, 9, 12].map(
                  (months) => {
                    const selected =
                      allowedDurations.includes(
                        months
                      );

                    return (
                      <button
                        key={months}
                        type="button"
                        onClick={() =>
                          toggleDuration(
                            months
                          )
                        }
                        className={
                          selected
                            ? "rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white"
                            : "rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        }
                      >
                        {months} Months
                      </button>
                    );
                  }
                )}
              </div>
            </div>

          </section>

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Saving Settings...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Loan Settings
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}