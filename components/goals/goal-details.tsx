"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Flag,
  Loader2,
  LockKeyhole,
  PencilLine,
  ReceiptText,
  Save,
  ShieldCheck,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type RecordValue =
  Record<string, unknown>;

type Props = {
  goal: RecordValue;

  member:
    | RecordValue
    | null;

  transactions:
    RecordValue[];

  staffName: string;
  staffRole: string;
};

type GoalStatus =
  | "active"
  | "completed"
  | "cancelled";

function textValue(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : "";
}

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
  return `${Math.round(
    numberValue(value)
  ).toLocaleString()} CFA`;
}

function percent(
  value: unknown
) {
  const number =
    numberValue(value);

  if (
    Number.isInteger(number)
  ) {
    return `${number}%`;
  }

  return `${number.toFixed(
    2
  )}%`;
}

function penaltyPercent(
  value: unknown
) {
  const number =
    numberValue(value);

  const percentage =
    number <= 1
      ? number * 100
      : number;

  if (
    Number.isInteger(
      percentage
    )
  ) {
    return `${percentage}%`;
  }

  return `${percentage.toFixed(
    2
  )}%`;
}

function formatDate(
  value: unknown
) {
  if (
    typeof value !==
      "string" ||
    !value
  ) {
    return "â€”";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "â€”";
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

function formatDateTime(
  value: unknown
) {
  if (
    typeof value !==
      "string" ||
    !value
  ) {
    return "â€”";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "â€”";
  }

  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function pretty(
  value: unknown
) {
  const text =
    textValue(value);

  if (!text) {
    return "Unknown";
  }

  return text
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

export default function GoalDetails({
  goal,
  member,
  transactions,
  staffName,
  staffRole,
}: Props) {
  const router =
    useRouter();

  const goalId =
    textValue(
      goal.id
    );

  const memberId =
    textValue(
      goal.user_id
    );

  const savedAmount =
    numberValue(
      goal.saved_amount
    );

  const lockedAmount =
    numberValue(
      goal.locked_amount
    );

  const availableAmount =
    Math.max(
      savedAmount -
        lockedAmount,
      0
    );

  const initialTarget =
    numberValue(
      goal.target_amount
    );

  const [
    name,
    setName,
  ] = useState(
    textValue(
      goal.name
    )
  );

  const [
    targetAmount,
    setTargetAmount,
  ] = useState(
    initialTarget.toString()
  );

  const [
    targetDate,
    setTargetDate,
  ] = useState(
    textValue(
      goal.target_date
    ).slice(
      0,
      10
    )
  );

  const [
    status,
    setStatus,
  ] =
    useState<GoalStatus>(
      (
        textValue(
          goal.status
        ) ||
        "active"
      ) as GoalStatus
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const target =
    Number(
      targetAmount
        .replaceAll(
          ",",
          ""
        )
    ) || 0;

  const progress =
    target > 0
      ? Math.min(
          (
            savedAmount /
            target
          ) * 100,
          100
        )
      : 0;

  // ============================================================
  // GOAL MANAGEMENT PERMISSION
  //
  // Viewing this page is protected separately by goals.view.
  // Editing safe Goal fields requires goals.manage.
  // ============================================================

  const [
    canEdit,
    setCanEdit,
  ] = useState(false);

  const [
    loadingPermission,
    setLoadingPermission,
  ] = useState(true);

  const canComplete =
    savedAmount >=
    target &&
    target >= 100000;

  const canCancel =
    lockedAmount <= 0;

  const memberName =
    textValue(
      member?.full_name
    ) ||
    "Unknown Member";

  const accountNumber =
    textValue(
      member?.account_number
    );

  const relevantTransactions =
    useMemo(
      () =>
        transactions.filter(
          (transaction) =>
            textValue(
              transaction.source_id
            ) ===
              goalId ||
            textValue(
              transaction.destination_id
            ) ===
              goalId
        ),
      [
        transactions,
        goalId,
      ]
    );

  useEffect(() => {
    let mounted =
      true;

    async function loadGoalPermission() {
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
            "goals.manage",
        }
      );

      if (!mounted) {
        return;
      }

      if (permissionError) {
        console.error(
          "GOAL PERMISSION ERROR:",
          permissionError
        );

        setCanEdit(
          false
        );

        setLoadingPermission(
          false
        );

        return;
      }

      setCanEdit(
        data === true
      );

      setLoadingPermission(
        false
      );
    }

    void loadGoalPermission();

    return () => {
      mounted =
        false;
    };
  }, []);

  async function saveGoal(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSuccess("");

    if (loadingPermission) {
      setError(
        "Goal permissions are still loading."
      );

      return;
    }

    if (!canEdit) {
      setError(
        "You do not have permission to edit Goals."
      );

      return;
    }

    if (
      name.trim().length <
      2
    ) {
      setError(
        "Goal name must contain at least 2 characters."
      );

      return;
    }

    if (
      target < 100000
    ) {
      setError(
        "Goal target must be at least 100,000 CFA."
      );

      return;
    }

    if (
      target <
      savedAmount
    ) {
      setError(
        `Goal target cannot be lower than the current savings of ${money(
          savedAmount
        )}.`
      );

      return;
    }

    if (
      status ===
        "completed" &&
      savedAmount <
        target
    ) {
      setError(
        "This Goal cannot be marked completed until the target is reached."
      );

      return;
    }

    if (
      status ===
        "cancelled" &&
      lockedAmount > 0
    ) {
      setError(
        "This Goal cannot be cancelled while it contains locked savings."
      );

      return;
    }

    setSaving(true);

    try {
      const supabase =
        createClient();

      const {
        data,
        error:
          rpcError,
      } = await supabase.rpc(
        "admin_update_goal",
        {
          p_goal_id:
            goalId,

          p_name:
            name.trim(),

          p_target_amount:
            target,

          p_target_date:
            targetDate ||
            null,

          p_status:
            status,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error(
          "Goal update was not completed."
        );
      }

      setSuccess(
        "Goal updated successfully."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update Goal."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/goals"
              className="inline-flex items-center gap-2 text-xs font-black text-blue-700 hover:underline"
            >
              <ArrowLeft
                size={15}
              />

              Back to Goals
            </Link>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Goal Details
            </h1>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:text-right">

            <p className="text-xs text-slate-400">
              Signed in as
            </p>

            <p className="mt-1 text-sm font-black text-slate-950">
              {staffName}
            </p>

            <p className="mt-1 text-xs font-bold uppercase text-blue-700">
              {staffRole.replaceAll(
                "_",
                " "
              )}
            </p>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-[1500px] p-5 md:p-8">

        {/* MEMBER + GOAL HEADER */}

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

                <Flag
                  size={26}
                />

              </div>

              <div className="flex-1">

                <div className="flex flex-wrap items-center gap-3">

                  <h2 className="text-2xl font-black text-slate-950">
                    {textValue(
                      goal.name
                    )}
                  </h2>

                  <GoalStatus
                    status={
                      textValue(
                        goal.status
                      )
                    }
                  />

                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">

                  <span className="flex items-center gap-2">

                    <UserRound
                      size={16}
                    />

                    {memberName}

                  </span>

                  {accountNumber && (
                    <span className="font-bold text-blue-700">
                      {accountNumber}
                    </span>
                  )}

                  <span className="flex items-center gap-2">

                    <CalendarDays
                      size={16}
                    />

                    Created{" "}
                    {formatDate(
                      goal.created_at
                    )}

                  </span>

                </div>

              </div>

            </div>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">

            <p className="text-sm font-bold text-slate-500">
              Goal Progress
            </p>

            <div className="mt-3 flex items-end justify-between">

              <p className="text-3xl font-black text-slate-950">
                {progress.toFixed(
                  1
                )}
                %
              </p>

              <p className="text-sm font-bold text-blue-700">
                {money(
                  savedAmount
                )}{" "}
                /{" "}
                {money(
                  target
                )}
              </p>

            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-blue-700"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

        </section>

        {/* MONEY CARDS */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            title="Target Amount"
            value={money(
              target
            )}
            icon={Target}
          />

          <SummaryCard
            title="Saved Amount"
            value={money(
              savedAmount
            )}
            icon={
              WalletCards
            }
          />

          <SummaryCard
            title="Locked Amount"
            value={money(
              lockedAmount
            )}
            icon={
              LockKeyhole
            }
          />

          <SummaryCard
            title="Available Savings"
            value={money(
              availableAmount
            )}
            icon={
              CircleDollarSign
            }
          />

        </section>

        {/* SETTINGS + INFO */}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">

          {/* EDIT */}

          <form
            onSubmit={
              saveGoal
            }
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">

                <PencilLine
                  size={20}
                />

              </div>

              <div>

                <h2 className="text-lg font-black text-slate-950">
                  Goal Management
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Edit safe Goal details. Savings balances are protected.
                </p>

              </div>

            </div>

            {loadingPermission ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">

                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Checking Goal management permission...

              </div>
            ) : !canEdit ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-sm font-black text-slate-900">
                  View-Only Goal Access
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  You can review this Goal, but your account does not have the goals.manage duty required to edit it.
                </p>

              </div>
            ) : null}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <div className="sm:col-span-2">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Goal Name
                </label>

                <input
                  type="text"
                  value={name}
                  disabled={
                    loadingPermission ||
                    !canEdit
                  }
                  onChange={(
                    event
                  ) =>
                    setName(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:bg-slate-50"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Target Amount
                </label>

                <div className="relative">

                  <input
                    type="number"
                    min="100000"
                    step="1"
                    value={
                      targetAmount
                    }
                    disabled={
                      loadingPermission ||
                      !canEdit
                    }
                    onChange={(
                      event
                    ) =>
                      setTargetAmount(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-16 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:bg-slate-50"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    CFA
                  </span>

                </div>

              </div>

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Target Date
                </label>

                <input
                  type="date"
                  value={
                    targetDate
                  }
                  disabled={
                    loadingPermission ||
                    !canEdit
                  }
                  onChange={(
                    event
                  ) =>
                    setTargetDate(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:bg-slate-50"
                />

              </div>

              <div className="sm:col-span-2">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Goal Status
                </label>

                <select
                  value={
                    status
                  }
                  disabled={
                    loadingPermission ||
                    !canEdit
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target
                        .value as GoalStatus
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:bg-slate-50"
                >

                  <option value="active">
                    Active
                  </option>

                  <option
                    value="completed"
                    disabled={
                      !canComplete
                    }
                  >
                    Completed
                  </option>

                  <option
                    value="cancelled"
                    disabled={
                      !canCancel
                    }
                  >
                    Cancelled
                  </option>

                </select>

                {!canComplete && (
                  <p className="mt-2 text-xs text-slate-400">
                    Completed becomes available when saved amount reaches the target.
                  </p>
                )}

                {!canCancel && (
                  <p className="mt-1 text-xs font-semibold text-amber-600">
                    This Goal cannot be cancelled while savings are locked.
                  </p>
                )}

              </div>

            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {success}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">

              <button
                type="submit"
                disabled={
                  saving ||
                  loadingPermission ||
                  !canEdit
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {saving ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <Save
                      size={18}
                    />

                    Save Goal
                  </>
                )}

              </button>

              <Link
                href={`/members/${memberId}`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Open Member
              </Link>

            </div>

          </form>

          {/* PROTECTED INFO */}

          <div className="space-y-6">

            <section className="rounded-3xl border border-slate-200 bg-white p-6">

              <div className="flex items-center gap-3">

                <ShieldCheck className="text-blue-700" />

                <h2 className="font-black text-slate-950">
                  Protected Financial Fields
                </h2>

              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Saved and locked balances cannot be edited directly from this page.
              </p>

              <div className="mt-5 space-y-4">

                <InfoValue
                  label="Saved Amount"
                  value={money(
                    savedAmount
                  )}
                />

                <InfoValue
                  label="Locked Amount"
                  value={money(
                    lockedAmount
                  )}
                />

                <InfoValue
                  label="Annual Interest"
                  value={percent(
                    goal.annual_interest_rate
                  )}
                />

                <InfoValue
                  label="Early Withdrawal Penalty"
                  value={penaltyPercent(
                    goal.early_withdrawal_penalty_rate
                  )}
                />

              </div>

              <Link
                href={`/members/${memberId}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
              >
                Adjust Account From Member Profile
              </Link>

            </section>

          </div>

        </section>

        {/* TRANSACTIONS */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

            <div>

              <h2 className="text-lg font-black text-slate-950">
                Goal Transactions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Transactions directly linked to this Goal.
              </p>

            </div>

            <ReceiptText className="text-blue-700" />

          </div>

          {relevantTransactions.length ===
          0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center">

              <ReceiptText
                size={30}
                className="text-slate-300"
              />

              <p className="mt-4 font-black text-slate-800">
                No Goal Transactions
              </p>

              <p className="mt-1 text-sm text-slate-500">
                No transaction has been directly linked to this Goal yet.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase text-slate-400">

                    <th className="px-5 py-4">
                      Type
                    </th>

                    <th className="px-5 py-4">
                      Amount
                    </th>

                    <th className="px-5 py-4">
                      Reference
                    </th>

                    <th className="px-5 py-4">
                      Description
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Date
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {relevantTransactions.map(
                    (
                      transaction,
                      index
                    ) => (
                      <tr
                        key={
                          textValue(
                            transaction.id
                          ) ||
                          `${index}`
                        }
                        className="border-b border-slate-100 last:border-0"
                      >

                        <td className="px-5 py-4 text-sm font-bold text-slate-900">
                          {pretty(
                            transaction.type
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-slate-950">
                          {money(
                            transaction.amount
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-blue-700">
                          {textValue(
                            transaction.reference
                          ) ||
                            "â€”"}
                        </td>

                        <td className="max-w-sm px-5 py-4 text-sm text-slate-500">
                          {textValue(
                            transaction.description
                          ) ||
                            "â€”"}
                        </td>

                        <td className="px-5 py-4">
                          <TransactionStatus
                            status={
                              textValue(
                                transaction.status
                              )
                            }
                          />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDateTime(
                            transaction.created_at
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>

    </main>
  );
}

function SummaryCard({
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

      <div className="flex items-center justify-between gap-4">

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

function InfoValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">

      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-black text-slate-900">
        {value}
      </span>

    </div>
  );
}

function GoalStatus({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  const style =
    normalized ===
      "active"
      ? "bg-emerald-50 text-emerald-700"
      : normalized ===
          "completed"
        ? "bg-blue-50 text-blue-700"
        : "bg-red-50 text-red-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${style}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}

function TransactionStatus({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  const style =
    normalized ===
        "successful" ||
      normalized ===
        "completed" ||
      normalized ===
        "paid"
      ? "bg-emerald-50 text-emerald-700"
      : normalized ===
          "pending"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-black ${style}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}