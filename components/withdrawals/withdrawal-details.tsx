"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  Smartphone,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type RecordValue =
  Record<string, unknown>;

type Props = {
  withdrawal:
    RecordValue;

  member:
    | RecordValue
    | null;

  wallet:
    | RecordValue
    | null;

  transaction:
    | RecordValue
    | null;

  actions:
    RecordValue[];

  staffName: string;
  staffRole: string;
};

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

function pretty(
  value: unknown
) {
  const text =
    textValue(value);

  if (!text) {
    return "Ã¢â‚¬â€";
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

function formatDateTime(
  value: unknown
) {
  const text =
    textValue(value);

  if (!text) {
    return "Ã¢â‚¬â€";
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Ã¢â‚¬â€";
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

export default function WithdrawalDetails({
  withdrawal,
  member,
  wallet,
  transaction,
  actions,
  staffName,
  staffRole,
}: Props) {
  const router =
    useRouter();

  const [
    adminNote,
    setAdminNote,
  ] = useState(
    textValue(
      withdrawal.admin_note
    )
  );

  const [
    payoutReference,
    setPayoutReference,
  ] = useState(
    textValue(
      withdrawal.payout_reference
    )
  );

  const [
    processingAction,
    setProcessingAction,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const status =
    textValue(
      withdrawal.status
    ).toLowerCase();

  const withdrawalId =
    textValue(
      withdrawal.id
    );

  const memberId =
    textValue(
      withdrawal.user_id
    );

  const memberName =
    textValue(
      member?.full_name
    ) ||
    "Unknown Member";

  // ============================================================
  // WITHDRAWAL MANAGEMENT PERMISSION
  //
  // Viewing this page is protected separately by withdrawals.view.
  // Financial actions require withdrawals.manage.
  // ============================================================

  const [
    canProcess,
    setCanProcess,
  ] = useState(false);

  const [
    loadingPermission,
    setLoadingPermission,
  ] = useState(true);

  useEffect(() => {
    let mounted =
      true;

    async function loadWithdrawalPermission() {
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
            "withdrawals.manage",
        }
      );

      if (!mounted) {
        return;
      }

      if (permissionError) {
        console.error(
          "WITHDRAWAL PERMISSION ERROR:",
          permissionError
        );

        setCanProcess(
          false
        );

        setLoadingPermission(
          false
        );

        return;
      }

      setCanProcess(
        data === true
      );

      setLoadingPermission(
        false
      );
    }

    void loadWithdrawalPermission();

    return () => {
      mounted =
        false;
    };
  }, []);

  const finalized =
    [
      "paid",
      "rejected",
      "cancelled",
    ].includes(
      status
    );

  async function processWithdrawal(
    action:
      | "approve"
      | "processing"
      | "paid"
      | "reject"
  ) {
    if (
      processingAction
    ) {
      return;
    }

    setError("");
    setSuccess("");

    if (loadingPermission) {
      setError(
        "Withdrawal permissions are still loading."
      );

      return;
    }

    if (!canProcess) {
      setError(
        "You do not have permission to process withdrawals."
      );

      return;
    }

    if (
      action ===
        "paid" &&
      !payoutReference.trim()
    ) {
      setError(
        "Enter the Mobile Money payout reference before marking this withdrawal as paid."
      );

      return;
    }

    if (
      action ===
        "reject" &&
      !adminNote.trim()
    ) {
      setError(
        "Enter a reason before rejecting this withdrawal."
      );

      return;
    }

    const confirmation =
      action === "approve"
        ? "Approve this withdrawal request?"
        : action === "processing"
          ? "Mark this withdrawal as processing?"
          : action === "paid"
            ? "Confirm that the Mobile Money payout has been completed?"
            : "Reject this withdrawal and return the locked money to the member's available wallet?";

    if (
      !window.confirm(
        confirmation
      )
    ) {
      return;
    }

    setProcessingAction(
      action
    );

    try {
      const supabase =
        createClient();

      const {
        error:
          rpcError,
      } = await supabase.rpc(
        "admin_process_withdrawal",
        {
          p_withdrawal_id:
            withdrawalId,

          p_action:
            action,

          p_admin_note:
            adminNote.trim() ||
            null,

          p_payout_reference:
            payoutReference.trim() ||
            null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setSuccess(
        action === "approve"
          ? "Withdrawal approved."
          : action ===
              "processing"
            ? "Withdrawal marked as processing."
            : action ===
                "paid"
              ? "Withdrawal successfully marked as paid."
              : "Withdrawal rejected and locked funds returned to the member."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process withdrawal."
      );
    } finally {
      setProcessingAction(
        ""
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/withdrawals"
              className="inline-flex items-center gap-2 text-xs font-black text-blue-700 hover:underline"
            >
              <ArrowLeft
                size={15}
              />

              Back to Withdrawals
            </Link>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Withdrawal Review
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

      <div className="mx-auto max-w-[1400px] p-5 md:p-8">

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="Withdrawal"
            value={money(
              withdrawal.amount
            )}
            icon={Banknote}
          />

          <SummaryCard
            label="Net Payout"
            value={money(
              withdrawal.net_amount
            )}
            icon={
              Smartphone
            }
          />

          <SummaryCard
            label="Available Wallet"
            value={money(
              wallet?.available_balance
            )}
            icon={
              WalletCards
            }
          />

          <SummaryCard
            label="Locked Wallet"
            value={money(
              wallet?.locked_balance
            )}
            icon={
              LockKeyhole
            }
          />

        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">

          <div className="space-y-6">

            <section className="rounded-3xl border border-slate-200 bg-white p-6">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                <div>

                  <p className="text-xs font-black uppercase text-slate-400">
                    Member
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {memberName}
                  </h2>

                  <p className="mt-1 font-bold text-blue-700">
                    {textValue(
                      member?.account_number
                    ) || "Ã¢â‚¬â€"}
                  </p>

                </div>

                <StatusBadge
                  status={
                    status
                  }
                />

              </div>

              <div className="mt-7 grid gap-6 sm:grid-cols-2">

                <Info
                  label="MoMo Account Name"
                  value={
                    textValue(
                      withdrawal.momo_account_name
                    ) ||
                    "Name not provided"
                  }
                />

                <Info
                  label="MoMo Number"
                  value={
                    textValue(
                      withdrawal.phone_number
                    ) ||
                    "Ã¢â‚¬â€"
                  }
                />

                <Info
                  label="Network"
                  value={
                    textValue(
                      withdrawal.mobile_network
                    ) ||
                    "Mobile Money"
                  }
                />

                <Info
                  label="Amount"
                  value={money(
                    withdrawal.amount
                  )}
                />

                <Info
                  label="Fee"
                  value={money(
                    withdrawal.fee
                  )}
                />

                <Info
                  label="Net Amount"
                  value={money(
                    withdrawal.net_amount
                  )}
                />

                <Info
                  label="Requested"
                  value={formatDateTime(
                    withdrawal.created_at
                  )}
                />

                <Info
                  label="Approved"
                  value={formatDateTime(
                    withdrawal.approved_at
                  )}
                />

                <Info
                  label="Processed"
                  value={formatDateTime(
                    withdrawal.processed_at
                  )}
                />

                <Info
                  label="Payout Reference"
                  value={
                    textValue(
                      withdrawal.payout_reference
                    ) ||
                    "Ã¢â‚¬â€"
                  }
                />

                <Info
                  label="Transaction Status"
                  value={pretty(
                    transaction?.status
                  )}
                />

              </div>

              <Link
                href={`/members/${memberId}`}
                className="mt-6 inline-flex rounded-xl bg-blue-50 px-5 py-3 text-sm font-black text-blue-700 hover:bg-blue-100"
              >
                <UserRound
                  size={17}
                  className="mr-2"
                />

                Open Member Profile
              </Link>

            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6">

              <h2 className="font-black text-slate-950">
                Processing History
              </h2>

              {actions.length ===
              0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No Admin action has been recorded yet.
                </p>
              ) : (
                <div className="mt-5 space-y-4">

                  {actions.map(
                    (
                      action,
                      index
                    ) => (
                      <div
                        key={
                          textValue(
                            action.id
                          ) ||
                          `${index}`
                        }
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >

                        <div className="flex flex-wrap items-center justify-between gap-2">

                          <p className="font-black text-slate-900">
                            {pretty(
                              action.action
                            )}
                          </p>

                          <p className="text-xs text-slate-400">
                            {formatDateTime(
                              action.created_at
                            )}
                          </p>

                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          {pretty(
                            action.previous_status
                          )}
                          {" Ã¢â€ â€™ "}
                          {pretty(
                            action.new_status
                          )}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {textValue(
                            action.staff_name
                          ) ||
                            "Authorized Staff"}
                        </p>

                        {textValue(
                          action.admin_note
                        ) && (
                          <p className="mt-2 text-sm text-slate-500">
                            {textValue(
                              action.admin_note
                            )}
                          </p>
                        )}

                      </div>
                    )
                  )}

                </div>
              )}

            </section>

          </div>

          <aside>

            <section className="rounded-3xl border border-slate-200 bg-white p-6">

              <h2 className="text-lg font-black text-slate-950">
                Process Withdrawal
              </h2>

              {loadingPermission ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">

                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Checking withdrawal management permission...

                </div>
              ) : !canProcess ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-sm font-black text-slate-900">
                    View-Only Withdrawal Access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    You can review this withdrawal, but your account does not have the withdrawals.manage duty required to approve, reject, process or mark it paid.
                  </p>

                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Funds are already locked. Approval does not deduct the wallet again.
                </p>
              )}

              <div className="mt-5">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Admin Note
                </label>

                <textarea
                  value={
                    adminNote
                  }
                  disabled={
                    finalized
                  }
                  onChange={(
                    event
                  ) =>
                    setAdminNote(
                      event.target
                        .value
                    )
                  }
                  rows={4}
                  placeholder="Optional for approval. Required when rejecting."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-50"
                />

              </div>

              {(status ===
                "approved" ||
                status ===
                  "processing") && (
                <div className="mt-4">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    MoMo Payout Reference
                  </label>

                  <input
                    value={
                      payoutReference
                    }
                    onChange={(
                      event
                    ) =>
                      setPayoutReference(
                        event.target
                          .value
                      )
                    }
                    placeholder="Example: MTN-REF-123456"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
                  />

                </div>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  {success}
                </div>
              )}

              <div className="mt-6 space-y-3">

                {status ===
                  "pending" && (
                    <button
                      type="button"
                      disabled={
                        !!processingAction ||
                        loadingPermission ||
                        !canProcess
                      }
                      onClick={() =>
                        processWithdrawal(
                          "approve"
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {processingAction ===
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

                      Approve Withdrawal
                    </button>
                  )}

                {status ===
                  "approved" && (
                    <button
                      type="button"
                      disabled={
                        !!processingAction ||
                        loadingPermission ||
                        !canProcess
                      }
                      onClick={() =>
                        processWithdrawal(
                          "processing"
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Clock3
                        size={18}
                      />

                      Mark Processing
                    </button>
                  )}

                {(status ===
                  "approved" ||
                  status ===
                    "processing") && (
                    <button
                      type="button"
                      disabled={
                        !!processingAction ||
                        loadingPermission ||
                        !canProcess
                      }
                      onClick={() =>
                        processWithdrawal(
                          "paid"
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {processingAction ===
                      "paid" ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Banknote
                          size={18}
                        />
                      )}

                      Mark Paid
                    </button>
                  )}

                {!finalized && (
                  <button
                    type="button"
                    disabled={
                      !!processingAction ||
                      loadingPermission ||
                      !canProcess
                    }
                    onClick={() =>
                      processWithdrawal(
                        "reject"
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {processingAction ===
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

                    Reject Withdrawal
                  </button>
                )}

              </div>

              {finalized && (
                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center">

                  <p className="font-black text-slate-800">
                    Withdrawal Finalized
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    No further financial action can be made.
                  </p>

                </div>
              )}

            </section>

          </aside>

        </section>

      </div>

    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;

  icon: React.ComponentType<{
    size?: number;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">

      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between gap-4">

        <p className="text-xl font-black text-slate-950">
          {value}
        </p>

        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
          <Icon
            size={20}
          />
        </div>

      </div>

    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs font-black uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let style =
    "bg-slate-100 text-slate-600";

  if (
    status ===
    "pending"
  ) {
    style =
      "bg-amber-50 text-amber-700";
  } else if (
    status ===
    "approved"
  ) {
    style =
      "bg-blue-50 text-blue-700";
  } else if (
    status ===
    "processing"
  ) {
    style =
      "bg-violet-50 text-violet-700";
  } else if (
    status ===
    "paid"
  ) {
    style =
      "bg-emerald-50 text-emerald-700";
  } else if (
    status ===
      "rejected" ||
    status ===
      "cancelled"
  ) {
    style =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-black ${style}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}
