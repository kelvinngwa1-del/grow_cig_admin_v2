"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  Loader2,
  ShieldCheck,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Loan = Record<string, any>;

type Member = {
  user_id: string;
  full_name?: string | null;
  account_number?: string | null;
  phone?: string | null;
  goal_savings?: number | string | null;
};

type Props = {
  loan: Loan;
  member: Member;

  repayments: Record<
    string,
    any
  >[];

  confirmedPaid: number;

  staff: {
    full_name: string;
    role: string;
  };
};

// ================================================================
// MONEY
// ================================================================

function money(
  value:
    | number
    | string
    | null
    | undefined
) {
  return `${Number(
    value ?? 0
  ).toLocaleString()} CFA`;
}

// ================================================================
// PRETTY TEXT
// ================================================================

function pretty(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "Pending";
  }

  return value
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

// ================================================================
// DATE
// ================================================================

function date(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "â€”";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

// ================================================================
// LOAN DETAILS
// ================================================================

export default function LoanDetails({
  loan,
  member,
  repayments,
  confirmedPaid,
  staff,
}: Props) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    processing,
    setProcessing,
  ] = useState<
    string | null
  >(null);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  // ============================================================
  // LOAN STATUS
  // ============================================================

  const status =
    loan.status?.toLowerCase() ??
    "pending";

  // ============================================================
  // TOTAL REPAYMENT
  // ============================================================

  const totalRepayment =
    Number(
      loan.total_repayment ??
        0
    );

  // ============================================================
  // ACTUAL AMOUNT PAID
  //
  // Repayment rows are now the main source of truth.
  //
  // Example:
  //
  // Installment 1:
  // amount_paid = 9,334
  //
  // Installment 2:
  // amount_paid = 0
  //
  // Installment 3:
  // amount_paid = 0
  //
  // Actual Paid = 9,334 CFA
  //
  // Older loans without repayment rows still use the
  // confirmedPaid prop as a safe fallback.
  // ============================================================

  const repaymentPaid =
    repayments.reduce(
      (
        total,
        repayment
      ) => {
        const amountPaid =
          Number(
            repayment.amount_paid ??
              0
          );

        return (
          total +
          amountPaid
        );
      },
      0
    );

  const actualPaid =
    repayments.length > 0
      ? repaymentPaid
      : Number(
          confirmedPaid ??
            0
        );

  // ============================================================
  // OUTSTANDING
  //
  // Outstanding is calculated from the repayment schedule:
  //
  // amount_due
  // + overdue_interest
  // - amount_paid
  //
  // This means overdue interest is automatically included.
  // ============================================================

  const repaymentOutstanding =
    repayments.reduce(
      (
        total,
        repayment
      ) => {
        const amountDue =
          Number(
            repayment.amount_due ??
              0
          );

        const overdueInterest =
          Number(
            repayment.overdue_interest ??
              0
          );

        const amountPaid =
          Number(
            repayment.amount_paid ??
              0
          );

        const remaining =
          Math.max(
            amountDue +
              overdueInterest -
              amountPaid,
            0
          );

        return (
          total +
          remaining
        );
      },
      0
    );

  // ============================================================
  // FALLBACK FOR OLD LOANS WITHOUT REPAYMENT RECORDS
  // ============================================================

  const outstanding =
    repayments.length > 0
      ? repaymentOutstanding
      : Math.max(
          totalRepayment -
            actualPaid,
          0
        );

  // ============================================================
  // ADMIN PERMISSIONS
  //
  // Frontend visibility now follows the same permission
  // system as the secured backend RPCs.
  // ============================================================

  const [
    canManage,
    setCanManage,
  ] = useState(false);

  useEffect(() => {
    let mounted =
      true;

    async function loadLoanPermission() {
      const client =
        createClient();

      const {
        data,
        error:
          permissionError,
      } = await client.rpc(
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

        setCanManage(
          false
        );

        return;
      }

      setCanManage(
        data === true
      );
    }

    void loadLoanPermission();

    return () => {
      mounted =
        false;
    };
  }, []);

  // ============================================================
  // LOAN ACTION
  // ============================================================

  async function runAction(
    action:
      | "approve"
      | "reject"
      | "disburse"
  ) {
    if (processing) {
      return;
    }

    setError("");
    setMessage("");

    if (!canManage) {
      setError(
        "You do not have permission to manage loans."
      );

      return;
    }

    // ----------------------------------------------------------
    // REJECTION REASON
    // ----------------------------------------------------------

    if (
      action ===
        "reject" &&
      rejectionReason
        .trim()
        .length < 5
    ) {
      setError(
        "Enter a clear reason for rejecting the loan."
      );

      return;
    }

    setProcessing(
      action
    );

    try {
      let rpcName = "";

      let params: Record<
        string,
        unknown
      > = {};

      // --------------------------------------------------------
      // APPROVE
      // --------------------------------------------------------

      if (
        action ===
        "approve"
      ) {
        rpcName =
          "admin_approve_loan";

        params = {
          p_loan_id:
            loan.id,

          p_admin_note:
            null,
        };
      }

      // --------------------------------------------------------
      // REJECT
      // --------------------------------------------------------

      if (
        action ===
        "reject"
      ) {
        rpcName =
          "admin_reject_loan";

        params = {
          p_loan_id:
            loan.id,

          p_reason:
            rejectionReason.trim(),
        };
      }

      // --------------------------------------------------------
      // DISBURSE
      // --------------------------------------------------------

      if (
        action ===
        "disburse"
      ) {
        rpcName =
          "admin_disburse_loan";

        params = {
          p_loan_id:
            loan.id,
        };
      }

      // --------------------------------------------------------
      // RPC
      // --------------------------------------------------------

      const {
        data,
        error: rpcError,
      } =
        await supabase.rpc(
          rpcName,
          params
        );

      console.log(
        "LOAN ACTION RESULT:",
        {
          action,
          data,
          rpcError,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      // --------------------------------------------------------
      // SUCCESS MESSAGE
      // --------------------------------------------------------

      setMessage(
        action ===
          "approve"
          ? "Loan approved successfully."
          : action ===
              "reject"
            ? "Loan rejected successfully."
            : "Loan disbursed successfully."
      );

      // --------------------------------------------------------
      // REFRESH PAGE
      // --------------------------------------------------------

      window.setTimeout(
        () => {
          router.refresh();
        },
        500
      );
    } catch (
      err: any
    ) {
      console.error(
        "LOAN ACTION ERROR:",
        err
      );

      const detailedMessage =
        err?.message ||
        err?.details ||
        err?.hint ||
        err?.error_description ||
        err?.code ||
        JSON.stringify(
          err
        ) ||
        "Unable to process loan.";

      setError(
        detailedMessage
      );
    } finally {
      setProcessing(
        null
      );
    }
  }

  // ==============================================================
  // PAGE
  // ==============================================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1500px] items-center justify-between">

          <div>

            <Link
              href="/loans"
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              â† Loans
            </Link>

            <h1 className="mt-2 text-2xl font-black text-slate-950">
              Loan Details
            </h1>

          </div>

          <div className="hidden text-right sm:block">

            <p className="text-sm font-bold text-slate-900">
              {staff.full_name}
            </p>

            <p className="text-xs text-slate-500">
              {pretty(
                staff.role
              )}
            </p>

          </div>

        </div>

      </header>

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <div className="mx-auto max-w-[1500px] p-5 md:p-8">

        {/* ======================================================
            MEMBER + STATUS
        ====================================================== */}

        <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">

          {/* MEMBER */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

                <UserRound
                  size={25}
                />

              </div>

              <div>

                <p className="text-xl font-black text-slate-950">
                  {member.full_name ??
                    "Member"}
                </p>

                <p className="mt-1 text-sm font-semibold text-blue-700">
                  {member.account_number ??
                    "No account number"}
                </p>

                {member.phone && (
                  <p className="mt-1 text-xs text-slate-500">
                    {member.phone}
                  </p>
                )}

              </div>

            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              <Info
                label="Loan ID"
                value={
                  loan.id
                }
              />

              <Info
                label="Source"
                value={
                  loan.admin_created
                    ? "Admin Created"
                    : "Member Applied"
                }
              />

              <Info
                label="Status"
                value={pretty(
                  status
                )}
              />

              <Info
                label="Created"
                value={date(
                  loan.created_at
                )}
              />

              <Info
                label="Approved"
                value={date(
                  loan.approved_at
                )}
              />

              <Info
                label="Disbursed"
                value={date(
                  loan.disbursed_at
                )}
              />

            </div>

          </div>

          {/* STATUS */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <p className="font-black text-slate-950">
              Loan Status
            </p>

            <div className="mt-4">

              <LoanStatus
                status={
                  status
                }
              />

            </div>

            {/* ELIGIBILITY OVERRIDE */}

            {loan.eligibility_overridden && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">

                <div className="flex gap-3">

                  <AlertTriangle
                    size={19}
                    className="shrink-0 text-amber-600"
                  />

                  <div>

                    <p className="text-sm font-bold text-amber-900">
                      Eligibility Overridden
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      {loan.admin_note ??
                        "No override note recorded."}
                    </p>

                  </div>

                </div>

              </div>
            )}

          </div>

        </section>

        {/* ======================================================
            MONEY CARDS
        ====================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MoneyCard
            title="Principal"
            value={money(
              loan.principal
            )}
            icon={
              HandCoins
            }
          />

          <MoneyCard
            title="Interest"
            value={money(
              loan.total_interest
            )}
            icon={
              CircleDollarSign
            }
          />

          <MoneyCard
            title="Total Repayment"
            value={money(
              loan.total_repayment
            )}
            icon={
              CreditCard
            }
          />

          <MoneyCard
            title="Outstanding"
            value={money(
              outstanding
            )}
            icon={
              WalletCards
            }
          />

        </section>

        {/* ======================================================
            LOAN TERMS + REPAYMENT SUMMARY
        ====================================================== */}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">

          {/* LOAN TERMS */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <p className="text-lg font-black text-slate-950">
              Loan Terms
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <Info
                label="Duration"
                value={`${loan.duration_months} months`}
              />

              <Info
                label="Monthly Interest"
                value={`${Number(
                  loan.monthly_interest_rate ??
                    0
                ) * 100}%`}
              />

              <Info
                label="Required Savings"
                value={money(
                  loan.required_savings
                )}
              />

              <Info
                label="Security Locked"
                value={money(
                  loan.security_locked
                )}
              />

              <Info
                label="Current Goal Savings"
                value={money(
                  member.goal_savings
                )}
              />

              {/* =================================================
                  FIXED:
                  NOW USES ACTUAL REPAYMENT ROWS
              ================================================= */}

              <Info
                label="Repayments Confirmed"
                value={money(
                  actualPaid
                )}
              />

            </div>

          </div>

          {/* REPAYMENT SUMMARY */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <p className="text-lg font-black text-slate-950">
              Repayment Summary
            </p>

            <div className="mt-5 space-y-4">

              <Info
                label="Repayment Records"
                value={
                  repayments.length.toString()
                }
              />

              {/* =================================================
                  FIXED:
                  ACTUAL SUM OF amount_paid
              ================================================= */}

              <Info
                label="Confirmed Paid"
                value={money(
                  actualPaid
                )}
              />

              <Info
                label="Outstanding"
                value={money(
                  outstanding
                )}
              />

            </div>

          </div>

        </section>

        {/* ======================================================
            ADMIN ACTIONS
        ====================================================== */}

        {canManage && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">

            <p className="text-lg font-black text-slate-950">
              Admin Actions
            </p>

            {/* SUCCESS */}

            {message && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">

                <CheckCircle2
                  size={18}
                />

                {message}

              </div>
            )}

            {/* ERROR */}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* ==================================================
                PENDING LOAN
            ================================================== */}

            {status ===
              "pending" && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">

                {/* APPROVE */}

                <button
                  type="button"
                  disabled={
                    processing !==
                    null
                  }
                  onClick={() =>
                    runAction(
                      "approve"
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50"
                >

                  {processing ===
                  "approve" ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2
                      size={18}
                    />
                  )}

                  Approve Loan

                </button>

                {/* REJECT */}

                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">

                  <label className="text-sm font-bold text-red-900">
                    Rejection Reason
                  </label>

                  <textarea
                    value={
                      rejectionReason
                    }
                    onChange={(
                      event
                    ) =>
                      setRejectionReason(
                        event
                          .target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Explain why the application is being rejected..."
                    className="mt-2 w-full rounded-xl border border-red-200 bg-white p-3 text-sm outline-none"
                  />

                  <button
                    type="button"
                    disabled={
                      processing !==
                      null
                    }
                    onClick={() =>
                      runAction(
                        "reject"
                      )
                    }
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                  >

                    {processing ===
                    "reject" ? (
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <XCircle
                        size={18}
                      />
                    )}

                    Reject Loan

                  </button>

                </div>

              </div>
            )}

            {/* ==================================================
                APPROVED LOAN
            ================================================== */}

            {status ===
              "approved" && (
              <div className="mt-5">

                <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">

                  <div className="flex gap-3">

                    <ShieldCheck
                      size={19}
                      className="shrink-0 text-blue-700"
                    />

                    <p className="text-sm leading-6 text-blue-800">
                      Disbursing this loan will lock the required Goal savings, credit the member&apos;s Wallet with the principal, create the repayment schedule, create a successful loan-disbursement transaction and change the loan to Active.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  disabled={
                    processing !==
                    null
                  }
                  onClick={() =>
                    runAction(
                      "disburse"
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white disabled:opacity-50"
                >

                  {processing ===
                  "disburse" ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <HandCoins
                      size={18}
                    />
                  )}

                  Disburse & Activate Loan

                </button>

              </div>
            )}

            {/* ==================================================
                ACTIVE LOAN
            ================================================== */}

            {(
              status ===
                "active" ||
              status ===
                "disbursed" ||
              status ===
                "repaying"
            ) && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">

                This loan is active. Repayment management will be handled from the Repayments module.

              </div>
            )}

            {/* ==================================================
                COMPLETED LOAN
            ================================================== */}

            {status ===
              "completed" && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">

                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <div>

                  <p className="font-bold">
                    Loan Fully Repaid
                  </p>

                  <p className="mt-1">
                    This loan has been completed and its security savings have been released.
                  </p>

                </div>

              </div>
            )}

            {/* ==================================================
                OVERDUE
            ================================================== */}

            {status ===
              "overdue" && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">

                <AlertTriangle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <div>

                  <p className="font-bold">
                    Loan Overdue
                  </p>

                  <p className="mt-1">
                    This loan has an overdue repayment obligation.
                  </p>

                </div>

              </div>
            )}

          </section>
        )}

      </div>

    </main>
  );
}

// ================================================================
// INFO
// ================================================================

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

// ================================================================
// MONEY CARD
// ================================================================

function MoneyCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;

  icon: React.ComponentType<{
    size?: number;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {value}
          </p>

        </div>

        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">

          <Icon
            size={21}
          />

        </div>

      </div>

    </div>
  );
}

// ================================================================
// LOAN STATUS
// ================================================================

function LoanStatus({
  status,
}: {
  status: string;
}) {
  let style =
    "bg-slate-100 text-slate-600";

  // --------------------------------------------------------------
  // PENDING
  // --------------------------------------------------------------

  if (
    status ===
    "pending"
  ) {
    style =
      "bg-amber-50 text-amber-700";
  }

  // --------------------------------------------------------------
  // APPROVED
  // --------------------------------------------------------------

  if (
    status ===
    "approved"
  ) {
    style =
      "bg-blue-50 text-blue-700";
  }

  // --------------------------------------------------------------
  // ACTIVE
  // --------------------------------------------------------------

  if (
    status ===
      "active" ||
    status ===
      "disbursed" ||
    status ===
      "repaying"
  ) {
    style =
      "bg-emerald-50 text-emerald-700";
  }

  // --------------------------------------------------------------
  // COMPLETED
  // --------------------------------------------------------------

  if (
    status ===
    "completed"
  ) {
    style =
      "bg-teal-50 text-teal-700";
  }

  // --------------------------------------------------------------
  // OVERDUE
  // --------------------------------------------------------------

  if (
    status ===
    "overdue"
  ) {
    style =
      "bg-orange-50 text-orange-700";
  }

  // --------------------------------------------------------------
  // REJECTED / DEFAULTED
  // --------------------------------------------------------------

  if (
    status ===
      "rejected" ||
    status ===
      "defaulted"
  ) {
    style =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${style}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}