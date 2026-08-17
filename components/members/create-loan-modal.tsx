"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Props = {
  memberId: string;
  memberName: string;

  goalSavings: number;

  memberJoinedAt: string | null;

  hasActiveLoan: boolean;
  hasPendingLoan: boolean;

  staffRole: string;

  onClose: () => void;
};

type LoanSettings = {
  requiredSavingsPercentage: number;
  monthlyInterestPercentage: number;
  minimumMembershipMonths: number;
  maximumLoanAmount: number;
  allowedDurations: number[];
  installmentsCount: number;
};

const EMPTY_SETTINGS: LoanSettings = {
  requiredSavingsPercentage: 0,
  monthlyInterestPercentage: 0,
  minimumMembershipMonths: 0,
  maximumLoanAmount: 0,
  allowedDurations: [],
  installmentsCount: 0,
};

function numberValue(
  value: unknown
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function money(
  value: number
) {
  return `${Math.round(
    value
  ).toLocaleString()} CFA`;
}

function percentage(
  value: number
) {
  if (Number.isInteger(value)) {
    return `${value}%`;
  }

  return `${value.toFixed(2)}%`;
}

function formatDate(
  value: Date | null
) {
  if (!value) {
    return "â€”";
  }

  return value.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function addMonths(
  date: Date,
  months: number
) {
  const result =
    new Date(date);

  const originalDay =
    result.getDate();

  result.setDate(1);

  result.setMonth(
    result.getMonth() +
      months
  );

  const lastDay =
    new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0
    ).getDate();

  result.setDate(
    Math.min(
      originalDay,
      lastDay
    )
  );

  return result;
}

export default function CreateLoanModal({
  memberId,
  memberName,
  goalSavings,
  memberJoinedAt,
  hasActiveLoan,
  hasPendingLoan,
  onClose,
}: Props) {
  const router =
    useRouter();

  const [
    principal,
    setPrincipal,
  ] = useState("");

  const [
    duration,
    setDuration,
  ] = useState(0);

  const [
    override,
    setOverride,
  ] = useState(false);

  const [
    note,
    setNote,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingSettings,
    setLoadingSettings,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    canManageLoans,
    setCanManageLoans,
  ] = useState(false);

  const [
    loadingPermission,
    setLoadingPermission,
  ] = useState(true);

  const [
    settings,
    setSettings,
  ] =
    useState<LoanSettings>(
      EMPTY_SETTINGS
    );

  // ============================================================
  // LOAD CURRENT ADMIN LOAN SETTINGS
  // ============================================================

  async function loadSettings() {
    setLoadingSettings(true);
    setError("");

    try {
      const supabase =
        createClient();

      const {
        data,
        error:
          settingsError,
      } = await supabase
        .from("loan_settings")
        .select(
          `
          required_savings_percentage,
          monthly_interest_percentage,
          minimum_membership_months,
          maximum_loan_amount,
          allowed_durations,
          installments_count
          `
        )
        .eq(
          "id",
          1
        )
        .single();

      if (settingsError) {
        throw settingsError;
      }

      if (!data) {
        throw new Error(
          "Loan settings could not be found."
        );
      }

      const rawDurations =
        Array.isArray(
          data.allowed_durations
        )
          ? data.allowed_durations
          : [];

      const durations =
        rawDurations
          .map((value) =>
            Number(value)
          )
          .filter(
            (value) =>
              Number.isInteger(
                value
              ) &&
              value > 0
          )
          .filter(
            (
              value,
              index,
              array
            ) =>
              array.indexOf(
                value
              ) === index
          )
          .sort(
            (a, b) =>
              a - b
          );

      const nextSettings: LoanSettings =
        {
          requiredSavingsPercentage:
            numberValue(
              data.required_savings_percentage
            ),

          monthlyInterestPercentage:
            numberValue(
              data.monthly_interest_percentage
            ),

          minimumMembershipMonths:
            numberValue(
              data.minimum_membership_months
            ),

          maximumLoanAmount:
            numberValue(
              data.maximum_loan_amount
            ),

          allowedDurations:
            durations,

          installmentsCount:
            numberValue(
              data.installments_count
            ),
        };

      if (
        nextSettings.maximumLoanAmount <=
        0
      ) {
        throw new Error(
          "Maximum loan amount is not configured correctly."
        );
      }

      if (
        nextSettings.requiredSavingsPercentage <
          0 ||
        nextSettings.requiredSavingsPercentage >
          100
      ) {
        throw new Error(
          "Required savings percentage is not configured correctly."
        );
      }

      if (
        nextSettings.monthlyInterestPercentage <
        0
      ) {
        throw new Error(
          "Monthly interest is not configured correctly."
        );
      }

      if (
        nextSettings.minimumMembershipMonths <
        0
      ) {
        throw new Error(
          "Minimum membership period is not configured correctly."
        );
      }

      if (
        nextSettings.installmentsCount <=
        0
      ) {
        throw new Error(
          "Installment count is not configured correctly."
        );
      }

      if (
        durations.length === 0
      ) {
        throw new Error(
          "No repayment durations have been configured."
        );
      }

      setSettings(
        nextSettings
      );

      setDuration(
        (current) => {
          if (
            durations.includes(
              current
            )
          ) {
            return current;
          }

          return durations[0];
        }
      );
    } catch (err) {
      setSettings(
        EMPTY_SETTINGS
      );

      setDuration(0);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load loan settings."
      );
    } finally {
      setLoadingSettings(
        false
      );
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  // ============================================================
  // LOAD LOAN MANAGEMENT PERMISSION
  // ============================================================

  useEffect(() => {
    let mounted =
      true;

    async function loadLoanPermission() {
      setLoadingPermission(
        true
      );

      const supabase =
        createClient();

      const {
        data,
        error:
          permissionError,
      } = await supabase.rpc(
        "staff_has_permission",
        {
          p_permission_key:
            "loans.manage",
        }
      );

      if (!mounted) {
        return;
      }

      if (permissionError) {
        console.error(
          "LOAN PERMISSION ERROR:",
          permissionError
        );

        setCanManageLoans(
          false
        );

        setLoadingPermission(
          false
        );

        return;
      }

      setCanManageLoans(
        data === true
      );

      setLoadingPermission(
        false
      );
    }

    void loadLoanPermission();

    return () => {
      mounted =
        false;
    };
  }, []);

  // ============================================================
  // MEMBER AGE
  // ============================================================

  const joinedDate =
    useMemo(() => {
      if (
        !memberJoinedAt
      ) {
        return null;
      }

      const date =
        new Date(
          memberJoinedAt
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return date;
    }, [
      memberJoinedAt,
    ]);

  const membershipEligibleDate =
    useMemo(() => {
      if (!joinedDate) {
        return null;
      }

      return addMonths(
        joinedDate,
        settings.minimumMembershipMonths
      );
    }, [
      joinedDate,
      settings.minimumMembershipMonths,
    ]);

  const membershipEligible =
    useMemo(() => {
      if (!joinedDate) {
        return false;
      }

      if (
        settings.minimumMembershipMonths <=
        0
      ) {
        return true;
      }

      if (
        !membershipEligibleDate
      ) {
        return false;
      }

      return (
        new Date().getTime() >=
        membershipEligibleDate.getTime()
      );
    }, [
      joinedDate,
      membershipEligibleDate,
      settings.minimumMembershipMonths,
    ]);

  // ============================================================
  // LOAN CALCULATIONS
  // ============================================================

  const amount =
    Number(
      principal
        .replaceAll(
          ",",
          ""
        )
        .trim()
    ) || 0;

  const calculations =
    useMemo(() => {
      const monthlyRate =
        settings.monthlyInterestPercentage /
        100;

      const savingsRate =
        settings.requiredSavingsPercentage /
        100;

      const totalInterest =
        amount *
        monthlyRate *
        duration;

      const totalRepayment =
        amount +
        totalInterest;

      const requiredSavings =
        amount *
        savingsRate;

      const savingsReached =
        amount > 0 &&
        goalSavings >=
          requiredSavings;

      const savingsShortfall =
        Math.max(
          requiredSavings -
            goalSavings,
          0
        );

      const installmentAmount =
        settings.installmentsCount >
        0
          ? totalRepayment /
            settings.installmentsCount
          : 0;

      return {
        monthlyRate,
        savingsRate,
        totalInterest,
        totalRepayment,
        requiredSavings,
        savingsReached,
        savingsShortfall,
        installmentAmount,
      };
    }, [
      amount,
      duration,
      goalSavings,
      settings,
    ]);

  // ============================================================
  // ELIGIBILITY
  // ============================================================

  const duplicateLoan =
    hasActiveLoan ||
    hasPendingLoan;

  const normalEligibility =
    membershipEligible &&
    calculations.savingsReached &&
    !duplicateLoan;

  const canOverride =
    canManageLoans;

  const amountValid =
    amount > 0 &&
    amount <=
      settings.maximumLoanAmount;

  const durationValid =
    settings.allowedDurations.includes(
      duration
    );

  const canSubmitNormally =
    !loadingSettings &&
    !loadingPermission &&
    canManageLoans &&
    amountValid &&
    durationValid &&
    normalEligibility;

  const canSubmitWithOverride =
    !loadingSettings &&
    !loadingPermission &&
    canManageLoans &&
    amountValid &&
    durationValid &&
    !duplicateLoan &&
    override &&
    canOverride &&
    note.trim().length >=
      5;

  const canSubmit =
    canSubmitNormally ||
    canSubmitWithOverride;

  // ============================================================
  // SUBMIT
  // ============================================================

  async function submitLoan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");

    if (loadingPermission) {
      setError(
        "Loan permissions are still loading."
      );

      return;
    }

    if (!canManageLoans) {
      setError(
        "You do not have permission to create or manage loans."
      );

      return;
    }

    if (loadingSettings) {
      setError(
        "Loan settings are still loading."
      );

      return;
    }

    if (amount <= 0) {
      setError(
        "Enter a valid loan amount."
      );

      return;
    }

    if (
      amount >
      settings.maximumLoanAmount
    ) {
      setError(
        `Maximum loan amount is ${money(
          settings.maximumLoanAmount
        )}.`
      );

      return;
    }

    if (
      !settings.allowedDurations.includes(
        duration
      )
    ) {
      setError(
        "The selected repayment duration is not allowed."
      );

      return;
    }

    if (duplicateLoan) {
      setError(
        "This member already has a pending or active loan."
      );

      return;
    }

    if (
      !normalEligibility &&
      !override
    ) {
      setError(
        "This member does not meet the current loan eligibility requirements. Use an authorized override if appropriate."
      );

      return;
    }

    if (
      override &&
      !canOverride
    ) {
      setError(
        "You do not have permission to override loan eligibility."
      );

      return;
    }

    if (
      override &&
      note.trim().length <
        5
    ) {
      setError(
        "Enter the reason for overriding eligibility."
      );

      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      // --------------------------------------------------------
      // REFRESH SETTINGS BEFORE FINAL SUBMISSION
      // --------------------------------------------------------

      const {
        data:
          latestSettings,
        error:
          latestSettingsError,
      } = await supabase
        .from(
          "loan_settings"
        )
        .select(
          `
          maximum_loan_amount,
          allowed_durations
          `
        )
        .eq(
          "id",
          1
        )
        .single();

      if (
        latestSettingsError
      ) {
        throw latestSettingsError;
      }

      const latestMaximum =
        numberValue(
          latestSettings.maximum_loan_amount
        );

      const latestDurations =
        Array.isArray(
          latestSettings.allowed_durations
        )
          ? latestSettings.allowed_durations
              .map((value) =>
                Number(value)
              )
              .filter(
                (value) =>
                  Number.isInteger(
                    value
                  ) &&
                  value > 0
              )
          : [];

      if (
        amount >
        latestMaximum
      ) {
        throw new Error(
          `Maximum loan amount has changed to ${money(
            latestMaximum
          )}. Refresh and try again.`
        );
      }

      if (
        !latestDurations.includes(
          duration
        )
      ) {
        throw new Error(
          "The selected repayment duration is no longer available. Refresh and try again."
        );
      }

      // --------------------------------------------------------
      // EXISTING ADMIN RPC
      //
      // The backend remains responsible for actually creating
      // the loan. We send only the principal, duration and
      // authorized override information.
      // --------------------------------------------------------

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "admin_create_member_loan",
        {
          p_user_id:
            memberId,

          p_principal:
            amount,

          p_duration_months:
            duration,

          p_override_eligibility:
            override,

          p_admin_note:
            note.trim() ||
            null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error(
          "Loan could not be created."
        );
      }

      setSuccess(
        "Loan created successfully."
      );

      window.setTimeout(
        () => {
          router.refresh();
          onClose();
        },
        900
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create loan."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-slate-200 p-6">

          <div className="flex items-center gap-3">

            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <HandCoins
                size={23}
              />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Create Member Loan
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {memberName}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>

        </div>

        {/* BODY */}

        <form
          onSubmit={submitLoan}
          className="space-y-6 p-6"
        >

          {/* PERMISSION CHECK */}

          {loadingPermission && (
            <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">

              <Loader2
                size={18}
                className="animate-spin"
              />

              Checking loan management permission...

            </div>
          )}

          {!loadingPermission &&
            !canManageLoans && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

                <p className="text-sm font-black text-amber-900">
                  Loan Management Access Required
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Your account can view this member, but it does not have the loans.manage duty required to create or override loans.
                </p>

              </div>
            )}

          {/* SETTINGS LOADING */}

          {loadingSettings && (
            <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">

              <Loader2
                size={18}
                className="animate-spin"
              />

              Loading current loan settings...

            </div>
          )}

          {!loadingSettings && (
            <>
              {/* CURRENT ADMIN RULES */}

              <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Current Loan Rules
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      These values are loaded from Admin Loan Settings.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void loadSettings()
                    }
                    className="rounded-xl border border-blue-200 bg-white p-2 text-blue-700 transition hover:bg-blue-50"
                    title="Refresh settings"
                  >
                    <RefreshCw
                      size={17}
                    />
                  </button>

                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  <RuleCard
                    label="Required Savings"
                    value={percentage(
                      settings.requiredSavingsPercentage
                    )}
                  />

                  <RuleCard
                    label="Minimum Membership"
                    value={`${settings.minimumMembershipMonths} months`}
                  />

                  <RuleCard
                    label="Monthly Interest"
                    value={percentage(
                      settings.monthlyInterestPercentage
                    )}
                  />

                  <RuleCard
                    label="Maximum Loan"
                    value={money(
                      settings.maximumLoanAmount
                    )}
                  />

                  <RuleCard
                    label="Installments"
                    value={`${settings.installmentsCount}`}
                  />

                  <RuleCard
                    label="Allowed Durations"
                    value={settings.allowedDurations
                      .map(
                        (months) =>
                          `${months}M`
                      )
                      .join(", ")}
                  />

                </div>

              </section>

              {/* MEMBER ELIGIBILITY */}

              <section className="rounded-2xl border border-slate-200 p-5">

                <div className="flex items-center gap-2">

                  <ShieldCheck
                    size={19}
                    className="text-blue-700"
                  />

                  <p className="font-black text-slate-950">
                    Member Eligibility
                  </p>

                </div>

                <div className="mt-4 space-y-3">

                  <EligibilityRow
                    label={`${settings.minimumMembershipMonths}-Month Membership`}
                    passed={
                      membershipEligible
                    }
                  />

                  <EligibilityRow
                    label={`${percentage(
                      settings.requiredSavingsPercentage
                    )} Savings Requirement`}
                    passed={
                      calculations.savingsReached
                    }
                  />

                  <EligibilityRow
                    label="No Active Loan"
                    passed={
                      !hasActiveLoan
                    }
                  />

                  <EligibilityRow
                    label="No Pending Loan"
                    passed={
                      !hasPendingLoan
                    }
                  />

                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">

                  <div className="grid gap-3 sm:grid-cols-2">

                    <SmallValue
                      label="Joined"
                      value={
                        joinedDate
                          ? formatDate(
                              joinedDate
                            )
                          : "Unknown"
                      }
                    />

                    <SmallValue
                      label="Eligible From"
                      value={
                        membershipEligibleDate
                          ? formatDate(
                              membershipEligibleDate
                            )
                          : "Unknown"
                      }
                    />

                    <SmallValue
                      label="Goal Savings"
                      value={money(
                        goalSavings
                      )}
                    />

                    <SmallValue
                      label="Membership"
                      value={
                        membershipEligible
                          ? "Eligible"
                          : "Not Yet Eligible"
                      }
                    />

                  </div>

                </div>

              </section>

              {/* LOAN AMOUNT */}

              <section>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Loan Amount
                </label>

                <div className="relative">

                  <input
                    type="number"
                    min="1"
                    max={
                      settings.maximumLoanAmount
                    }
                    step="1"
                    required
                    value={principal}
                    onChange={(
                      event
                    ) =>
                      setPrincipal(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter loan amount"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-16 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    CFA
                  </span>

                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Maximum:{" "}
                  {money(
                    settings.maximumLoanAmount
                  )}
                </p>

              </section>

              {/* DURATION */}

              <section>

                <label className="mb-3 block text-sm font-bold text-slate-700">
                  Repayment Duration (Months)
                </label>

                <div className="flex flex-wrap gap-3">

                  {settings.allowedDurations.map(
                    (months) => {
                      const selected =
                        duration ===
                        months;

                      return (
                        <button
                          key={
                            months
                          }
                          type="button"
                          onClick={() =>
                            setDuration(
                              months
                            )
                          }
                          className={
                            selected
                              ? "rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm"
                              : "rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          }
                        >
                          {months} Months
                        </button>
                      );
                    }
                  )}

                </div>

              </section>

              {/* CALCULATIONS */}

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                <p className="text-sm font-black text-slate-950">
                  Loan Calculation
                </p>

                <div className="mt-4 space-y-3">

                  <CalculationRow
                    label="Principal"
                    value={money(
                      amount
                    )}
                  />

                  <CalculationRow
                    label={`Required Savings (${percentage(
                      settings.requiredSavingsPercentage
                    )})`}
                    value={money(
                      calculations.requiredSavings
                    )}
                  />

                  <CalculationRow
                    label="Member Goal Savings"
                    value={money(
                      goalSavings
                    )}
                  />

                  {!calculations.savingsReached &&
                    amount > 0 && (
                      <CalculationRow
                        label="Savings Shortfall"
                        value={money(
                          calculations.savingsShortfall
                        )}
                        warning
                      />
                    )}

                  <CalculationRow
                    label={`Monthly Interest (${percentage(
                      settings.monthlyInterestPercentage
                    )})`}
                    value={`${duration} month${
                      duration ===
                      1
                        ? ""
                        : "s"
                    }`}
                  />

                  <CalculationRow
                    label="Total Interest"
                    value={money(
                      calculations.totalInterest
                    )}
                  />

                  <div className="border-t border-slate-200 pt-3">

                    <CalculationRow
                      label="Total Repayment"
                      value={money(
                        calculations.totalRepayment
                      )}
                      important
                    />

                  </div>

                  <CalculationRow
                    label={`${settings.installmentsCount} Installments`}
                    value={money(
                      calculations.installmentAmount
                    )}
                  />

                </div>

              </section>

              {/* ELIGIBILITY RESULT */}

              <section
                className={
                  normalEligibility
                    ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                    : "rounded-2xl border border-amber-200 bg-amber-50 p-4"
                }
              >

                <div className="flex items-start gap-3">

                  {normalEligibility ? (
                    <CheckCircle2
                      size={21}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />
                  ) : (
                    <AlertTriangle
                      size={21}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />
                  )}

                  <div>

                    <p
                      className={
                        normalEligibility
                          ? "text-sm font-black text-emerald-800"
                          : "text-sm font-black text-amber-800"
                      }
                    >
                      {normalEligibility
                        ? "Member Meets Loan Requirements"
                        : "Eligibility Requirements Not Met"}
                    </p>

                    <p
                      className={
                        normalEligibility
                          ? "mt-1 text-xs leading-5 text-emerald-700"
                          : "mt-1 text-xs leading-5 text-amber-700"
                      }
                    >
                      {normalEligibility
                        ? "This member currently meets the normal Admin loan requirements."
                        : duplicateLoan
                          ? "This member already has a pending or active loan. A duplicate loan cannot be created."
                          : !membershipEligible
                            ? membershipEligibleDate
                              ? `The member has not reached the ${settings.minimumMembershipMonths}-month membership requirement. Eligible from ${formatDate(
                                  membershipEligibleDate
                                )}.`
                              : "The member's joining date is unavailable."
                            : !calculations.savingsReached
                              ? `The member needs ${money(
                                  calculations.savingsShortfall
                                )} more in Goal savings for this loan amount.`
                              : "The member does not currently meet all normal loan requirements."}
                    </p>

                  </div>

                </div>

              </section>

              {/* OVERRIDE */}

              {canOverride &&
                !duplicateLoan &&
                !normalEligibility && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={
                          override
                        }
                        onChange={(
                          event
                        ) =>
                          setOverride(
                            event.target
                              .checked
                          )
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />

                      <div>

                        <p className="text-sm font-black text-amber-900">
                          Authorized Eligibility Override
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          Use only when an authorized Admin decision allows this member to bypass normal membership or savings eligibility.
                        </p>

                      </div>

                    </label>

                    {override && (
                      <div className="mt-4">

                        <label className="mb-2 block text-xs font-bold text-amber-900">
                          Override Reason
                        </label>

                        <textarea
                          value={
                            note
                          }
                          onChange={(
                            event
                          ) =>
                            setNote(
                              event.target
                                .value
                            )
                          }
                          rows={3}
                          placeholder="Explain why this eligibility override is being used..."
                          className="w-full resize-none rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                        />

                      </div>
                    )}

                  </section>
                )}

              {/* ERROR */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {/* SUCCESS */}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {success}
                </div>
              )}

              {/* BUTTONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    onClose
                  }
                  disabled={
                    loading
                  }
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !canSubmit
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Creating Loan...
                    </>
                  ) : (
                    <>
                      <HandCoins
                        size={18}
                      />

                      Create Loan
                    </>
                  )}

                </button>

              </div>
            </>
          )}

        </form>

      </div>

    </div>
  );
}

// ================================================================
// HELPER COMPONENTS
// ================================================================

function RuleCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-3">

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-950">
        {value}
      </p>

    </div>
  );
}

function SmallValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

function EligibilityRow({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">

      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span
        className={
          passed
            ? "inline-flex shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
            : "inline-flex shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"
        }
      >
        {passed
          ? "Passed"
          : "Not Met"}
      </span>

    </div>
  );
}

function CalculationRow({
  label,
  value,
  important = false,
  warning = false,
}: {
  label: string;
  value: string;
  important?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span
        className={
          important
            ? "text-sm font-black text-slate-950"
            : "text-sm text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={
          warning
            ? "text-sm font-black text-amber-700"
            : important
              ? "text-base font-black text-blue-700"
              : "text-sm font-bold text-slate-900"
        }
      >
        {value}
      </span>

    </div>
  );
}