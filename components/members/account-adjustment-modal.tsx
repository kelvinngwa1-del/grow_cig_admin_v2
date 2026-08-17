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
  CircleDollarSign,
  Flag,
  Loader2,
  MinusCircle,
  PlusCircle,
  ReceiptText,
  RefreshCw,
  WalletCards,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type GoalOption = {
  id: string;
  name: string;
  saved_amount: number | string | null;
  locked_amount: number | string | null;
  status: string | null;
};

type Props = {
  memberId: string;
  memberName: string;
  walletBalance: number;
  goals: GoalOption[];
  staffRole: string;
  onClose: () => void;
};

type DestinationType =
  | "wallet"
  | "goal";

type AdjustmentAction =
  | "credit"
  | "debit";

function numberValue(
  value: unknown
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
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

function generateReference() {
  const now =
    new Date();

  const date =
    [
      now.getFullYear(),
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      ),
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      ),
    ].join("");

  const time =
    [
      String(
        now.getHours()
      ).padStart(
        2,
        "0"
      ),
      String(
        now.getMinutes()
      ).padStart(
        2,
        "0"
      ),
      String(
        now.getSeconds()
      ).padStart(
        2,
        "0"
      ),
    ].join("");

  return `POS-${date}-${time}`;
}

function toDateTimeLocalValue(
  date: Date
) {
  const offset =
    date.getTimezoneOffset();

  const local =
    new Date(
      date.getTime() -
        offset * 60 * 1000
    );

  return local
    .toISOString()
    .slice(
      0,
      16
    );
}

export default function AccountAdjustmentModal({
  memberId,
  memberName,
  walletBalance,
  goals,
  onClose,
}: Props) {
  const router =
    useRouter();

  const [
    destinationType,
    setDestinationType,
  ] =
    useState<DestinationType>(
      "wallet"
    );

  const [
    action,
    setAction,
  ] =
    useState<AdjustmentAction>(
      "credit"
    );

  const [
    selectedGoalId,
    setSelectedGoalId,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    reference,
    setReference,
  ] = useState(
    generateReference()
  );

  const [
    originalTransactionAt,
    setOriginalTransactionAt,
  ] = useState(
    toDateTimeLocalValue(
      new Date()
    )
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    latestWalletBalance,
    setLatestWalletBalance,
  ] = useState(
    walletBalance
  );

  const [
    latestGoals,
    setLatestGoals,
  ] =
    useState<GoalOption[]>(
      goals
    );

  // ============================================================
  // MANUAL ACCOUNT ADJUSTMENT PERMISSION
  //
  // Viewing member information is protected separately by
  // members.view. Manual credits / debits require
  // members.adjust_balance.
  // ============================================================

  const [
    canAdjust,
    setCanAdjust,
  ] = useState(false);

  const [
    loadingPermission,
    setLoadingPermission,
  ] = useState(true);

  const numericAmount =
    Number(
      amount
        .replaceAll(
          ",",
          ""
        )
        .trim()
    ) || 0;

  const selectedGoal =
    useMemo(() => {
      return latestGoals.find(
        (goal) =>
          goal.id ===
          selectedGoalId
      );
    }, [
      latestGoals,
      selectedGoalId,
    ]);

  const currentBalance =
    destinationType ===
    "wallet"
      ? latestWalletBalance
      : numberValue(
          selectedGoal
            ?.saved_amount
        );

  const balanceAfter =
    action ===
    "credit"
      ? currentBalance +
        numericAmount
      : currentBalance -
        numericAmount;

  const debitTooLarge =
    action ===
      "debit" &&
    numericAmount >
      currentBalance;

  useEffect(() => {
    let mounted =
      true;

    async function loadAdjustmentPermission() {
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
            "members.adjust_balance",
        }
      );

      if (!mounted) {
        return;
      }

      if (permissionError) {
        console.error(
          "ACCOUNT ADJUSTMENT PERMISSION ERROR:",
          permissionError
        );

        setCanAdjust(
          false
        );

        setLoadingPermission(
          false
        );

        return;
      }

      setCanAdjust(
        data === true
      );

      setLoadingPermission(
        false
      );
    }

    void loadAdjustmentPermission();

    return () => {
      mounted =
        false;
    };
  }, []);

  useEffect(() => {
    if (
      destinationType ===
        "goal" &&
      latestGoals.length >
        0 &&
      !selectedGoalId
    ) {
      setSelectedGoalId(
        latestGoals[0].id
      );
    }
  }, [
    destinationType,
    latestGoals,
    selectedGoalId,
  ]);

  async function refreshBalances() {
    try {
      const supabase =
        createClient();

      const [
        walletResult,
        goalsResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "wallets"
            )
            .select(
              "available_balance"
            )
            .eq(
              "user_id",
              memberId
            )
            .maybeSingle(),

          supabase
            .from(
              "goals"
            )
            .select(
              "id, name, saved_amount, locked_amount, status"
            )
            .eq(
              "user_id",
              memberId
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            ),
        ]);

      if (
        walletResult.error
      ) {
        throw walletResult.error;
      }

      if (
        goalsResult.error
      ) {
        throw goalsResult.error;
      }

      setLatestWalletBalance(
        numberValue(
          walletResult.data
            ?.available_balance
        )
      );

      const rows =
        (goalsResult.data ??
          []) as GoalOption[];

      setLatestGoals(
        rows
      );

      if (
        destinationType ===
          "goal" &&
        rows.length > 0 &&
        !rows.some(
          (goal) =>
            goal.id ===
            selectedGoalId
        )
      ) {
        setSelectedGoalId(
          rows[0].id
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh balances."
      );
    }
  }

  async function submitAdjustment(
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
        "Account adjustment permission is still loading."
      );

      return;
    }

    if (!canAdjust) {
      setError(
        "You do not have permission to adjust member balances."
      );

      return;
    }

    if (
      destinationType ===
        "goal" &&
      !selectedGoalId
    ) {
      setError(
        "Select a Goal."
      );

      return;
    }

    if (
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid amount."
      );

      return;
    }

    if (
      action ===
        "debit" &&
      numericAmount >
        currentBalance
    ) {
      setError(
        `Insufficient balance. Current balance is ${money(
          currentBalance
        )}.`
      );

      return;
    }

    if (
      reason.trim().length <
      3
    ) {
      setError(
        "Enter a reason for this manual transaction."
      );

      return;
    }

    if (
      reference.trim()
        .length < 3
    ) {
      setError(
        "Enter a valid receipt or reference number."
      );

      return;
    }

    const confirmed =
      window.confirm(
        action ===
          "credit"
          ? `Credit ${money(
              numericAmount
            )} to this member's ${
              destinationType ===
              "wallet"
                ? "Wallet"
                : `Goal "${
                    selectedGoal
                      ?.name ??
                    ""
                  }"`
            }?`
          : `Debit ${money(
              numericAmount
            )} from this member's ${
              destinationType ===
              "wallet"
                ? "Wallet"
                : `Goal "${
                    selectedGoal
                      ?.name ??
                    ""
                  }"`
            }?`
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      const originalDate =
        originalTransactionAt
          ? new Date(
              originalTransactionAt
            )
          : null;

      if (
        originalDate &&
        Number.isNaN(
          originalDate.getTime()
        )
      ) {
        throw new Error(
          "Original transaction date is invalid."
        );
      }

      const {
        data,
        error:
          rpcError,
      } = await supabase.rpc(
        "admin_manual_account_adjustment",
        {
          p_user_id:
            memberId,

          p_destination_type:
            destinationType,

          p_goal_id:
            destinationType ===
            "goal"
              ? selectedGoalId
              : null,

          p_action:
            action,

          p_amount:
            numericAmount,

          p_reason:
            reason.trim(),

          p_reference:
            reference.trim(),

          p_original_transaction_at:
            originalDate
              ? originalDate.toISOString()
              : null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error(
          "Account adjustment was not completed."
        );
      }

      setSuccess(
        action ===
          "credit"
          ? `${money(
              numericAmount
            )} credited successfully.`
          : `${money(
              numericAmount
            )} debited successfully.`
      );

      await refreshBalances();

      router.refresh();

      window.setTimeout(
        () => {
          onClose();
        },
        1000
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process account adjustment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-slate-200 p-6">

          <div className="flex items-center gap-3">

            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">

              <CircleDollarSign
                size={24}
              />

            </div>

            <div>

              <h2 className="text-xl font-black text-slate-950">
                Adjust Account
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manual POS deposit or authorized balance correction for{" "}
                <span className="font-bold text-slate-700">
                  {memberName}
                </span>
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X
              size={20}
            />
          </button>

        </div>

        <form
          onSubmit={
            submitAdjustment
          }
          className="space-y-6 p-6"
        >

          {loadingPermission ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

              <div className="flex items-center gap-3 text-sm font-semibold text-blue-700">

                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Checking account adjustment permission...

              </div>

            </div>
          ) : !canAdjust ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">

              <div className="flex items-start gap-3">

                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div>

                  <p className="text-sm font-black text-red-800">
                    View-Only Member Access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    Your account does not have the members.adjust_balance duty required to manually credit or debit this member.
                  </p>

                </div>

              </div>

            </div>
          ) : null}

          {/* OPERATION */}

          <section className="rounded-2xl border border-slate-200 p-5">

            <p className="text-sm font-black text-slate-950">
              Adjustment Type
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  loadingPermission ||
                  !canAdjust
                }
                onClick={() =>
                  setAction(
                    "credit"
                  )
                }
                className={
                  action ===
                  "credit"
                    ? "rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 text-left"
                    : "rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
                }
              >

                <div className="flex items-start gap-3">

                  <PlusCircle
                    size={21}
                    className={
                      action ===
                      "credit"
                        ? "text-emerald-700"
                        : "text-slate-400"
                    }
                  />

                  <div>

                    <p className="text-sm font-black text-slate-900">
                      Credit
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Record a manual deposit or add money to the member account.
                    </p>

                  </div>

                </div>

              </button>

              <button
                type="button"
                disabled={
                  loadingPermission ||
                  !canAdjust
                }
                onClick={() =>
                  setAction(
                    "debit"
                  )
                }
                className={
                  action ===
                  "debit"
                    ? "rounded-2xl border-2 border-red-400 bg-red-50 p-4 text-left"
                    : "rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
                }
              >

                <div className="flex items-start gap-3">

                  <MinusCircle
                    size={21}
                    className={
                      action ===
                      "debit"
                        ? "text-red-600"
                        : "text-slate-400"
                    }
                  />

                  <div>

                    <p className="text-sm font-black text-slate-900">
                      Debit
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Correct an incorrect balance by removing available money.
                    </p>

                  </div>

                </div>

              </button>

            </div>

          </section>

          {/* DESTINATION */}

          <section className="rounded-2xl border border-slate-200 p-5">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-sm font-black text-slate-950">
                  Account Destination
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Choose where this adjustment should be posted.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  void refreshBalances()
                }
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-blue-700"
                title="Refresh balances"
              >
                <RefreshCw
                  size={17}
                />
              </button>

            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  loadingPermission ||
                  !canAdjust
                }
                onClick={() =>
                  setDestinationType(
                    "wallet"
                  )
                }
                className={
                  destinationType ===
                  "wallet"
                    ? "rounded-2xl border-2 border-blue-600 bg-blue-50 p-4 text-left"
                    : "rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
                }
              >

                <div className="flex items-start gap-3">

                  <WalletCards
                    size={21}
                    className="text-blue-700"
                  />

                  <div>

                    <p className="text-sm font-black text-slate-900">
                      Wallet
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Available Balance
                    </p>

                    <p className="mt-2 text-lg font-black text-blue-700">
                      {money(
                        latestWalletBalance
                      )}
                    </p>

                  </div>

                </div>

              </button>

              <button
                type="button"
                onClick={() =>
                  setDestinationType(
                    "goal"
                  )
                }
                disabled={
                  loadingPermission ||
                  !canAdjust ||
                  latestGoals.length ===
                  0
                }
                className={
                  destinationType ===
                  "goal"
                    ? "rounded-2xl border-2 border-blue-600 bg-blue-50 p-4 text-left"
                    : "rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                }
              >

                <div className="flex items-start gap-3">

                  <Flag
                    size={21}
                    className="text-blue-700"
                  />

                  <div>

                    <p className="text-sm font-black text-slate-900">
                      Goal
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {latestGoals.length >
                      0
                        ? "Post directly to one of the member's savings Goals."
                        : "This member has no Goal."}
                    </p>

                  </div>

                </div>

              </button>

            </div>

            {destinationType ===
              "goal" &&
              latestGoals.length >
                0 && (
                <div className="mt-4">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Select Goal
                  </label>

                  <select
                    value={
                      selectedGoalId
                    }
                    disabled={
                      loadingPermission ||
                      !canAdjust
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedGoalId(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >

                    {latestGoals.map(
                      (goal) => (
                        <option
                          key={
                            goal.id
                          }
                          value={
                            goal.id
                          }
                        >
                          {goal.name} â€”{" "}
                          {money(
                            numberValue(
                              goal.saved_amount
                            )
                          )}
                        </option>
                      )
                    )}

                  </select>

                </div>
              )}

          </section>

          {/* AMOUNT */}

          <section>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Amount
            </label>

            <div className="relative">

              <input
                type="number"
                min="1"
                disabled={
                  loadingPermission ||
                  !canAdjust
                }
                step="1"
                required
                value={
                  amount
                }
                onChange={(
                  event
                ) =>
                  setAmount(
                    event.target
                      .value
                  )
                }
                placeholder="Enter amount"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-16 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                CFA
              </span>

            </div>

          </section>

          {/* BALANCE PREVIEW */}

          {numericAmount >
            0 && (
            <section className="rounded-2xl bg-slate-50 p-5">

              <p className="text-sm font-black text-slate-950">
                Balance Preview
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">

                <PreviewValue
                  label="Current"
                  value={money(
                    currentBalance
                  )}
                />

                <PreviewValue
                  label={
                    action ===
                    "credit"
                      ? "Adding"
                      : "Removing"
                  }
                  value={money(
                    numericAmount
                  )}
                />

                <PreviewValue
                  label="After"
                  value={
                    balanceAfter <
                    0
                      ? "Invalid"
                      : money(
                          balanceAfter
                        )
                  }
                  warning={
                    balanceAfter <
                    0
                  }
                  strong
                />

              </div>

              {debitTooLarge && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">

                  <AlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0"
                  />

                  Debit cannot exceed the available balance.

                </div>
              )}

            </section>
          )}

          {/* REFERENCE */}

          <section className="grid gap-5 sm:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Receipt / Reference
              </label>

              <div className="relative">

                <ReceiptText
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  required
                  disabled={
                    loadingPermission ||
                    !canAdjust
                  }
                  value={
                    reference
                  }
                  onChange={(
                    event
                  ) =>
                    setReference(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />

              </div>

            </div>

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Original Transaction Time
              </label>

              <input
                type="datetime-local"
                disabled={
                  loadingPermission ||
                  !canAdjust
                }
                value={
                  originalTransactionAt
                }
                onChange={(
                  event
                ) =>
                  setOriginalTransactionAt(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />

            </div>

          </section>

          {/* REASON */}

          <section>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Reason
            </label>

            <textarea
              required
              disabled={
                loadingPermission ||
                !canAdjust
              }
              value={
                reason
              }
              onChange={(
                event
              ) =>
                setReason(
                  event.target
                    .value
                )
              }
              rows={3}
              placeholder={
                action ===
                "credit"
                  ? "Example: Cash deposit collected during network outage."
                  : "Example: Correction of duplicate balance posting."
              }
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />

          </section>

          {/* AUDIT NOTICE */}

          <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">

            <div className="flex items-start gap-3">

              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-blue-700"
              />

              <div>

                <p className="text-sm font-black text-blue-900">
                  Audited Manual Transaction
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  The transaction will be marked as manual, linked to the staff account that posts it, and stored with the reason, reference and original transaction time.
                </p>

              </div>

            </div>

          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

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
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                loadingPermission ||
                !canAdjust ||
                numericAmount <=
                  0 ||
                debitTooLarge ||
                reason.trim()
                    .length <
                  3 ||
                reference.trim()
                    .length <
                  3 ||
                (
                  destinationType ===
                    "goal" &&
                  !selectedGoalId
                )
              }
              className={
                action ===
                "credit"
                  ? "flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  : "flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >

              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Processing...
                </>
              ) : action ===
                "credit" ? (
                <>
                  <PlusCircle
                    size={18}
                  />

                  Credit Account
                </>
              ) : (
                <>
                  <MinusCircle
                    size={18}
                  />

                  Debit Account
                </>
              )}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

function PreviewValue({
  label,
  value,
  strong = false,
  warning = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  warning?: boolean;
}) {
  return (
    <div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={
          warning
            ? "mt-1 text-lg font-black text-red-600"
            : strong
              ? "mt-1 text-lg font-black text-blue-700"
              : "mt-1 text-sm font-bold text-slate-900"
        }
      >
        {value}
      </p>

    </div>
  );
}