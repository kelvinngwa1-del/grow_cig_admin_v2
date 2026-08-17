"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  BadgeCheck,
  BanknoteArrowDown,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Flag,
  HandCoins,
  Mail,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import CreateLoanModal from "./create-loan-modal";
import AccountAdjustmentModal from "./account-adjustment-modal";
import RegistrationPaymentModal from "./registration-payment-modal";

type Staff = {
  full_name: string;
  email: string;
  role: string;
};

type Member = {
  user_id: string;

  full_name: string | null;
  email: string | null;
  phone: string | null;

  account_number: string | null;
  referral_code: string | null;

  registration_fee_due:
    | number
    | string
    | null;

  registration_fee_paid:
    | number
    | string
    | null;

  joined_at: string | null;

  wallet_balance:
    | number
    | string
    | null;

  locked_balance:
    | number
    | string
    | null;

  goal_savings:
    | number
    | string
    | null;

  total_savings:
    | number
    | string
    | null;

  active_goal_count:
    | number
    | string
    | null;

  kyc_status:
    | string
    | null;

  active_loan_count:
    | number
    | string
    | null;

  pending_loan_count:
    | number
    | string
    | null;

  referral_earnings:
    | number
    | string
    | null;

  member_activity_status:
    | string
    | null;
};

type Props = {
  member: Member;

  goals: Record<
    string,
    unknown
  >[];

  transactions: Record<
    string,
    unknown
  >[];

  withdrawals: Record<
    string,
    unknown
  >[];

  loans: Record<
    string,
    unknown
  >[];

  repayments: Record<
    string,
    unknown
  >[];

  referrals: Record<
    string,
    unknown
  >[];

  kyc:
    | Record<
        string,
        unknown
      >
    | null;

  staff: Staff;
};

function numberValue(
  value: unknown
) {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function money(
  value: unknown
) {
  return `${numberValue(
    value
  ).toLocaleString()} CFA`;
}

function pretty(
  value: string | null
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

function formatDate(
  value: string | null
) {
  if (!value) {
    return "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â";
  }

  return date.toLocaleDateString(
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

export default function MemberProfile({
  member,
  goals,
  transactions,
  withdrawals,
  loans,
  repayments,
  referrals,
  kyc,
  staff,
}: Props) {
  const [
    showCreateLoan,
    setShowCreateLoan,
  ] = useState(false);

  const [
    showAdjustAccount,
    setShowAdjustAccount,
  ] = useState(false);
  const [
    showRegistrationPayment,
    setShowRegistrationPayment,
  ] = useState(false);

  const [
    minimumMembershipMonths,
    setMinimumMembershipMonths,
  ] = useState(0);

  const [
    loadingLoanSettings,
    setLoadingLoanSettings,
  ] = useState(true);
  const registrationFeeDue =
    numberValue(
      member.registration_fee_due
    );

  const registrationFeePaid =
    numberValue(
      member.registration_fee_paid
    );

  const registrationFeeRemaining =
    Math.max(
      registrationFeeDue -
        registrationFeePaid,
      0
    );

  const registrationComplete =
    registrationFeeRemaining <= 0;

  const registrationProgress =
    registrationFeeDue > 0
      ? Math.min(
          (
            registrationFeePaid /
            registrationFeeDue
          ) * 100,
          100
        )
      : 0;


  const active =
    member.member_activity_status ===
    "active";

  const hasActiveLoan =
    numberValue(
      member.active_loan_count
    ) > 0;

  const hasPendingLoan =
    numberValue(
      member.pending_loan_count
    ) > 0;

  // ============================================================
  // GOALS FOR ACCOUNT ADJUSTMENT
  // ============================================================

  const adjustmentGoals =
    useMemo(() => {
      return goals
        .map((goal) => {
          const id =
            typeof goal.id ===
            "string"
              ? goal.id
              : "";

          const name =
            typeof goal.name ===
            "string"
              ? goal.name
              : "Savings Goal";

          const status =
            typeof goal.status ===
            "string"
              ? goal.status
              : null;

          return {
            id,
            name,

            saved_amount:
              numberValue(
                goal.saved_amount
              ),

            locked_amount:
              numberValue(
                goal.locked_amount
              ),

            status,
          };
        })
        .filter(
          (goal) =>
            goal.id.length > 0
        );
    }, [
      goals,
    ]);

  // ============================================================
  // LOAD CURRENT LOAN MEMBERSHIP RULE
  // ============================================================

  useEffect(() => {
    let activeRequest =
      true;

    async function loadLoanSettings() {
      try {
        const supabase =
          createClient();

        const {
          data,
          error,
        } = await supabase
          .from(
            "loan_settings"
          )
          .select(
            "minimum_membership_months"
          )
          .eq(
            "id",
            1
          )
          .single();

        if (error) {
          throw error;
        }

        if (
          !activeRequest
        ) {
          return;
        }

        setMinimumMembershipMonths(
          Number(
            data
              ?.minimum_membership_months ??
              0
          )
        );
      } catch {
        if (
          activeRequest
        ) {
          setMinimumMembershipMonths(
            0
          );
        }
      } finally {
        if (
          activeRequest
        ) {
          setLoadingLoanSettings(
            false
          );
        }
      }
    }

    void loadLoanSettings();

    return () => {
      activeRequest = false;
    };
  }, []);

  // ============================================================
  // DYNAMIC MEMBERSHIP ELIGIBILITY
  // ============================================================

  const joinedDate =
    useMemo(() => {
      if (
        !member.joined_at
      ) {
        return null;
      }

      const date =
        new Date(
          member.joined_at
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
      member.joined_at,
    ]);

  const membershipEligibleDate =
    useMemo(() => {
      if (!joinedDate) {
        return null;
      }

      return addMonths(
        joinedDate,
        minimumMembershipMonths
      );
    }, [
      joinedDate,
      minimumMembershipMonths,
    ]);

  const membershipEligible =
    useMemo(() => {
      if (!joinedDate) {
        return false;
      }

      if (
        minimumMembershipMonths <=
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
      minimumMembershipMonths,
    ]);

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">

          <div>

            <Link
              href="/members"
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Members
            </Link>

            <h1 className="mt-2 text-2xl font-black text-slate-950">
              Member Profile
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

      <div className="mx-auto max-w-[1600px] p-5 md:p-8">

        {/* ====================================================
            PROFILE + ELIGIBILITY
        ==================================================== */}

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">

          {/* MEMBER PROFILE */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-3xl font-black text-blue-700">

                {(member.full_name ??
                  "M")
                  .charAt(0)
                  .toUpperCase()}

              </div>

              <div className="flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <h2 className="text-2xl font-black text-slate-950">
                    {member.full_name ??
                      "Member"}
                  </h2>

                  <StatusPill
                    value={
                      active
                        ? "Active"
                        : "Inactive"
                    }
                    type={
                      active
                        ? "success"
                        : "neutral"
                    }
                  />

                </div>

                <p className="mt-1 text-sm font-semibold text-blue-700">
                  {member.account_number ??
                    "No account number"}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  <InfoRow
                    icon={Mail}
                    label={
                      member.email ??
                      "No email"
                    }
                  />

                  <InfoRow
                    icon={Phone}
                    label={
                      member.phone ??
                      "No phone"
                    }
                  />

                  <InfoRow
                    icon={
                      CalendarDays
                    }
                    label={`Joined ${formatDate(
                      member.joined_at
                    )}`}
                  />

                  <InfoRow
                    icon={Users}
                    label={`Referral code: ${
                      member.referral_code ??
                      "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"
                    }`}
                  />

                </div>

              </div>

            </div>

          </div>

          {/* MEMBERSHIP ELIGIBILITY */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <p className="text-sm font-semibold text-slate-500">
              Membership Eligibility
            </p>

            <div className="mt-4 space-y-4">

              {loadingLoanSettings ? (
                <StatusLine
                  label="Membership Requirement"
                  good={false}
                  pending
                />
              ) : (
                <StatusLine
                  label={`${minimumMembershipMonths}-Month Membership`}
                  good={
                    membershipEligible
                  }
                />
              )}

              <StatusLine
                label="KYC"
                good={
                  member.kyc_status
                    ?.toLowerCase() ===
                  "approved"
                }
              />

              <StatusLine
                label="No Active Loan"
                good={
                  !hasActiveLoan
                }
              />

              <StatusLine
                label="No Pending Loan"
                good={
                  !hasPendingLoan
                }
              />

            </div>

            {!loadingLoanSettings && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Joined
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {joinedDate
                        ? joinedDate.toLocaleDateString(
                            "en-GB",
                            {
                              day:
                                "2-digit",
                              month:
                                "short",
                              year:
                                "numeric",
                            }
                          )
                        : "Unknown"}
                    </p>

                  </div>

                  <div>

                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Loan Eligible From
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {membershipEligibleDate
                        ? membershipEligibleDate.toLocaleDateString(
                            "en-GB",
                            {
                              day:
                                "2-digit",
                              month:
                                "short",
                              year:
                                "numeric",
                            }
                          )
                        : "Unknown"}
                    </p>

                  </div>

                </div>

              </div>
            )}

          </div>

        </section>

        {/* ====================================================
            MONEY CARDS
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MoneyCard
            title="Available Wallet"
            value={money(
              member.wallet_balance
            )}
            icon={
              WalletCards
            }
          />

          <MoneyCard
            title="Locked Balance"
            value={money(
              member.locked_balance
            )}
            icon={
              ShieldCheck
            }
          />

          <MoneyCard
            title="Goal Savings"
            value={money(
              member.goal_savings
            )}
            icon={Flag}
          />

          <MoneyCard
            title="Total Savings"
            value={money(
              member.total_savings
            )}
            icon={
              CircleDollarSign
            }
          />

        </section>
        {/* ====================================================
            REGISTRATION FEE STATUS
        ==================================================== */}

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-lg font-black text-slate-950">
                Registration Fee Status
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Registration payment progress for this member.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-black ${
                registrationComplete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {registrationComplete
                ? "Complete"
                : "Incomplete"}
            </span>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Paid
              </p>

              <p className="mt-2 text-xl font-black text-slate-950">
                {money(
                  registrationFeePaid
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Total Fee
              </p>

              <p className="mt-2 text-xl font-black text-slate-950">
                {money(
                  registrationFeeDue
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Remaining
              </p>

              <p className="mt-2 text-xl font-black text-blue-800">
                {money(
                  registrationFeeRemaining
                )}
              </p>
            </div>

          </div>

          <div className="mt-5">

            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>
                Registration Progress
              </span>

              <span>
                {registrationProgress.toFixed(
                  0
                )}%
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${registrationProgress}%`,
                }}
              />
            </div>

          </div>

        </section>


        {/* ====================================================
            RECORDS + KYC
        ==================================================== */}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">

          {/* MEMBER RECORDS */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-lg font-black text-slate-950">
                  Member Records
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Click a record to open the corresponding Admin module.
                </p>

              </div>

              <ReceiptText className="text-blue-700" />

            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">

              <RecordCard
                title="Goals"
                count={
                  goals.length
                }
                icon={Flag}
                href="/goals"
              />

              <RecordCard
                title="Transactions"
                count={
                  transactions.length
                }
                icon={
                  ReceiptText
                }
                href="/transactions"
              />

              <RecordCard
                title="Withdrawals"
                count={
                  withdrawals.length
                }
                icon={
                  BanknoteArrowDown
                }
                href="/withdrawals"
              />

              <RecordCard
                title="Loans"
                count={
                  loans.length
                }
                icon={
                  HandCoins
                }
                href="/loans"
              />

              <RecordCard
                title="Repayments"
                count={
                  repayments.length
                }
                icon={
                  CreditCard
                }
                href="/repayments"
              />

              <RecordCard
                title="Referrals"
                count={
                  referrals.length
                }
                icon={Users}
                href="/referrals"
              />

            </div>

          </div>

          {/* KYC */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <div className="flex items-center gap-3">

              <UserRound className="text-blue-700" />

              <div>

                <p className="font-black text-slate-950">
                  KYC Overview
                </p>

                <p className="text-sm text-slate-500">
                  Verification status
                </p>

              </div>

            </div>

            <div className="mt-5">

              <StatusPill
                value={pretty(
                  member.kyc_status
                )}
                type={
                  member.kyc_status
                    ?.toLowerCase() ===
                  "approved"
                    ? "success"
                    : "warning"
                }
              />

              {kyc ? (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  KYC information exists for this member and can be reviewed from the KYC module.
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  This member has not submitted complete KYC information yet.
                </p>
              )}

            </div>

          </div>

        </section>

        {/* ====================================================
            ADMIN ACTIONS
        ==================================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">

          <p className="text-lg font-black text-slate-950">
            Admin Actions
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Actions available for this member.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

            <ActionCard
              title="Create Loan"
              description="Create a loan directly for this member."
              icon={
                HandCoins
              }
              onClick={() =>
                setShowCreateLoan(
                  true
                )
              }
            />

            <ActionCard
              title="Adjust Account"
              description="Post a manual deposit, credit or debit."
              icon={
                CircleDollarSign
              }
              onClick={() =>
                setShowAdjustAccount(
                  true
                )
              }
            />
            <ActionCard
              title="Add Registration Payment"
              description="Record a direct registration fee payment."
              icon={
                CreditCard
              }
              onClick={() =>
                setShowRegistrationPayment(
                  true
                )
              }
            />


            <ActionCard
              title="Review KYC"
              description="Open the member verification records."
              icon={
                BadgeCheck
              }
              href="/kyc"
            />

            <ActionCard
              title="View Transactions"
              description="Review complete account activity."
              icon={
                ReceiptText
              }
              href="/transactions"
            />

            <ActionCard
              title="View Goals"
              description="Review savings goals and progress."
              icon={Flag}
              href="/goals"
            />

          </div>

        </section>

      </div>

      {/* ======================================================
          CREATE LOAN MODAL
      ====================================================== */}

      {showCreateLoan && (
        <CreateLoanModal
          memberId={
            member.user_id
          }
          memberName={
            member.full_name ??
            "Member"
          }
          goalSavings={numberValue(
            member.goal_savings
          )}
          memberJoinedAt={
            member.joined_at
          }
          hasActiveLoan={
            hasActiveLoan
          }
          hasPendingLoan={
            hasPendingLoan
          }
          staffRole={
            staff.role
          }
          onClose={() =>
            setShowCreateLoan(
              false
            )
          }
        />
      )}

      {/* ======================================================
          ACCOUNT ADJUSTMENT MODAL
      ====================================================== */}
      {/* ======================================================
          REGISTRATION PAYMENT MODAL
      ====================================================== */}

      {showRegistrationPayment && (
        <RegistrationPaymentModal
          memberId={
            member.user_id
          }
          memberName={
            member.full_name ??
            "Member"
          }
          registrationFeeDue={
            member.registration_fee_due
          }
          registrationFeePaid={
            member.registration_fee_paid
          }
          onClose={() =>
            setShowRegistrationPayment(
              false
            )
          }
          onSuccess={() => {
            setShowRegistrationPayment(
              false
            );

            window.location.reload();
          }}
        />
      )}


      {showAdjustAccount && (
        <AccountAdjustmentModal
          memberId={
            member.user_id
          }
          memberName={
            member.full_name ??
            "Member"
          }
          walletBalance={numberValue(
            member.wallet_balance
          )}
          goals={
            adjustmentGoals
          }
          staffRole={
            staff.role
          }
          onClose={() =>
            setShowAdjustAccount(
              false
            )
          }
        />
      )}

    </main>
  );
}

// ================================================================
// INFO ROW
// ================================================================

function InfoRow({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;

  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">

      <Icon
        size={16}
      />

      <span>
        {label}
      </span>

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

          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-2xl font-black text-slate-950">
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
// RECORD CARD
// ================================================================

function RecordCard({
  title,
  count,
  icon: Icon,
  href,
}: {
  title: string;
  count: number;
  href: string;

  icon: React.ComponentType<{
    size?: number;
  }>;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40"
    >

      <div className="flex items-center justify-between gap-3">

        <div>

          <p className="text-sm font-bold text-slate-900">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {count}
          </p>

        </div>

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">

            <Icon
              size={19}
            />

          </div>

          <ChevronRight
            size={17}
            className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-700"
          />

        </div>

      </div>

    </Link>
  );
}

// ================================================================
// ACTION CARD
// ================================================================

function ActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  href,
}: {
  title: string;
  description: string;

  icon: React.ComponentType<{
    size?: number;
  }>;

  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3">

      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">

        <Icon
          size={19}
        />

      </div>

      <div className="flex-1">

        <p className="text-sm font-black text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>

      </div>

      <ChevronRight
        size={16}
        className="mt-1 text-slate-400"
      />

    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
    >
      {content}
    </button>
  );
}

// ================================================================
// STATUS LINE
// ================================================================

function StatusLine({
  label,
  good,
  pending = false,
}: {
  label: string;
  good: boolean;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">

      <span className="text-sm text-slate-600">
        {label}
      </span>

      {pending ? (
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
          Loading
        </span>
      ) : (
        <StatusPill
          value={
            good
              ? "Passed"
              : "Not Met"
          }
          type={
            good
              ? "success"
              : "warning"
          }
        />
      )}

    </div>
  );
}

// ================================================================
// STATUS PILL
// ================================================================

function StatusPill({
  value,
  type,
}: {
  value: string;

  type:
    | "success"
    | "warning"
    | "neutral";
}) {
  const styles = {
    success:
      "bg-emerald-50 text-emerald-700",

    warning:
      "bg-amber-50 text-amber-700",

    neutral:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[type]}`}
    >
      {value}
    </span>
  );
}