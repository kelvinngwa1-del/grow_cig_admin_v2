"use client";

import {
  useState,
} from "react";

import type {
  ComponentType,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  ArrowLeft,
  Banknote,
  Check,
  Clipboard,
  Clock3,
  Mail,
  MessageCircle,
  Printer,
  ReceiptText,
  Share2,
  ShieldCheck,
  Smartphone,
  UserRound,
  WalletCards,
} from "lucide-react";

type RecordValue =
  Record<string, unknown>;

type Props = {
  transaction:
    RecordValue;

  member:
    | RecordValue
    | null;

  processingStaff:
    | RecordValue
    | null;

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
  const number =
    Number(value ?? 0);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function boolValue(
  value: unknown
) {
  return value === true;
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
  if (
    typeof value !==
      "string" ||
    !value
  ) {
    return "Ã¢â‚¬â€";
  }

  const date =
    new Date(value);

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

function normalizeWhatsAppPhone(
  phone: string
) {
  let digits =
    phone.replace(
      /\D/g,
      ""
    );

  // Cameroon local number:
  // 6XXXXXXXX
  if (
    digits.length === 9
  ) {
    digits =
      `237${digits}`;
  }

  // Handle 00237...
  if (
    digits.startsWith(
      "00237"
    )
  ) {
    digits =
      digits.substring(2);
  }

  return digits;
}

export default function TransactionDetails({
  transaction,
  member,
  processingStaff,
  staffName,
  staffRole,
}: Props) {
  const [
    copied,
    setCopied,
  ] = useState(false);
  const router =
    useRouter();

  const [
    processingDeposit,
    setProcessingDeposit,
  ] = useState(false);

  const [
    depositError,
    setDepositError,
  ] = useState("");

  const [
    depositSuccess,
    setDepositSuccess,
  ] = useState("");

  const transactionId =
    textValue(
      transaction.id
    );

  const rawTransactionType =
    textValue(
      transaction.type
    ).toLowerCase();

  const rawTransactionStatus =
    textValue(
      transaction.status
    ).toLowerCase();

  const isPendingDeposit =
    rawTransactionType ===
      "deposit" &&
    rawTransactionStatus ===
      "pending";

  // ============================================================
  // MEMBER
  // ============================================================

  const memberName =
    textValue(
      member?.full_name
    ) ||
    "Unknown Member";

  const accountNumber =
    textValue(
      member?.account_number
    ) ||
    "Ã¢â‚¬â€";

  const phone =
    textValue(
      member?.phone
    );

  const email =
    textValue(
      member?.email
    );

  // ============================================================
  // TRANSACTION
  // ============================================================

  const reference =
    textValue(
      transaction.reference
    ) ||
    textValue(
      transaction.id
    );

  const transactionType =
    pretty(
      transaction.type
    );

  const amount =
    money(
      transaction.amount
    );

  const status =
    pretty(
      transaction.status
    );

  const manual =
    boolValue(
      transaction.manual_entry
    );

  const fee =
    numberValue(
      transaction.fee
    );

  const netAmount =
    transaction.net_amount !==
      null &&
    transaction.net_amount !==
      undefined
      ? numberValue(
          transaction.net_amount
        )
      : numberValue(
          transaction.amount
        ) -
        fee;

  // ============================================================
  // RECEIPT TEXT
  // ============================================================

  // ============================================================
  // APPROVE PENDING DEPOSIT
  // ============================================================

  async function approveDeposit() {
    if (
      processingDeposit ||
      !isPendingDeposit
    ) {
      return;
    }

    if (!transactionId) {
      setDepositError(
        "Transaction ID is missing."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Confirm that you have verified receipt of ${amount} before approving this deposit.`
      );

    if (!confirmed) {
      return;
    }

    setDepositError("");
    setDepositSuccess("");
    setProcessingDeposit(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        error,
      } = await supabase.rpc(
        "admin_confirm_pending_deposit",
        {
          p_transaction_id:
            transactionId,
        }
      );

      if (error) {
        throw error;
      }

      setDepositSuccess(
        "Deposit approved and credited successfully."
      );

      router.refresh();
    } catch (error: unknown) {
      console.error(
        "DEPOSIT APPROVAL ERROR:",
        error
      );

      const message =
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (
          error as {
            message?: unknown;
          }
        ).message === "string"
          ? (
              error as {
                message: string;
              }
            ).message
          : "Unable to approve deposit.";

      setDepositError(
        message
      );
    } finally {
      setProcessingDeposit(
        false
      );
    }
  }

  const receiptText =
`GROW COMMON INITIATIVE GROUP
TRANSACTION RECEIPT

Member: ${memberName}
Account Number: ${accountNumber}

Transaction: ${transactionType}
Amount: ${amount}
Fee: ${money(fee)}
Net Amount: ${money(netAmount)}

Status: ${status}
Reference: ${reference}

Source: ${pretty(transaction.source_type)}
Destination: ${pretty(transaction.destination_type)}

Transaction Date: ${formatDateTime(transaction.created_at)}
${manual
  ? `
Entry Type: Manual / POS
Processed By: ${
      textValue(
        processingStaff?.full_name
      ) ||
      "Authorized Staff"
    }
Reason: ${
      textValue(
        transaction.manual_reason
      ) ||
      "Ã¢â‚¬â€"
    }
Original Transaction Time: ${formatDateTime(
      transaction.original_transaction_at
    )}`
  : `
Entry Type: Automatic`
}

${
  textValue(
    transaction.description
  )
    ? `Description: ${textValue(
        transaction.description
      )}`
    : ""
}

Thank you for saving with GROW CIG.

Empowering People, Businesses and Communities Together.`;

  // ============================================================
  // COPY
  // ============================================================

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(
        receiptText
      );

      setCopied(
        true
      );

      window.setTimeout(
        () => {
          setCopied(
            false
          );
        },
        2000
      );
    } catch {
      window.alert(
        "Unable to copy receipt."
      );
    }
  }

  // ============================================================
  // SHARE
  // ============================================================

  async function shareReceipt() {
    if (
      navigator.share
    ) {
      try {
        await navigator.share({
          title:
            "GROW CIG Transaction Receipt",

          text:
            receiptText,
        });

        return;
      } catch {
        return;
      }
    }

    await copyReceipt();

    window.alert(
      "Receipt copied. You can paste and send it."
    );
  }

  // ============================================================
  // WHATSAPP
  // ============================================================

  function sendWhatsApp() {
    const message =
      encodeURIComponent(
        receiptText
      );

    const normalizedPhone =
      normalizeWhatsAppPhone(
        phone
      );

    const url =
      normalizedPhone
        ? `https://wa.me/${normalizedPhone}?text=${message}`
        : `https://wa.me/?text=${message}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ============================================================
  // EMAIL
  // ============================================================

  function sendEmail() {
    if (!email) {
      window.alert(
        "This customer does not have an email address saved."
      );

      return;
    }

    const subject =
      encodeURIComponent(
        `GROW CIG Transaction Receipt - ${reference}`
      );

    const body =
      encodeURIComponent(
        receiptText
      );

    window.location.href =
      `mailto:${email}?subject=${subject}&body=${body}`;
  }

  // ============================================================
  // PRINT
  // ============================================================

  function printReceipt() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8 print:hidden">

        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 text-xs font-black text-blue-700 hover:underline"
            >
              <ArrowLeft
                size={15}
              />

              Back to Transactions
            </Link>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Transaction Details
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review and send the customer&apos;s transaction receipt.
            </p>

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

      <div className="mx-auto max-w-[1400px] p-5 md:p-8 print:max-w-none print:p-0">

        <section className="grid gap-6 xl:grid-cols-[1fr_380px] print:block">

          {/* ==================================================
              LEFT SIDE
          ================================================== */}

          <div>

            {/* SUMMARY */}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">

              <SummaryCard
                label="Amount"
                value={amount}
                icon={
                  Banknote
                }
              />

              <SummaryCard
                label="Fee"
                value={money(
                  fee
                )}
                icon={
                  WalletCards
                }
              />

              <SummaryCard
                label="Status"
                value={status}
                icon={
                  ShieldCheck
                }
              />

              <SummaryCard
                label="Entry"
                value={
                  manual
                    ? "Manual / POS"
                    : "Automatic"
                }
                icon={
                  manual
                    ? Smartphone
                    : Clock3
                }
              />

            </div>

            {/* ==================================================
                RECEIPT
            ================================================== */}

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8 print:mt-0 print:rounded-none print:border-0 print:p-8">

              {/* RECEIPT HEADER */}

              <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">

                <div>

                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                    GROW CIG
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Transaction Receipt
                  </h2>

                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    GROW COMMON INITIATIVE GROUP
                  </p>

                </div>

                <StatusBadge
                  status={
                    textValue(
                      transaction.status
                    )
                  }
                />

              </div>

              {/* CUSTOMER */}

              <div className="mt-7">

                <div className="flex items-center gap-2">

                  <UserRound
                    size={18}
                    className="text-blue-700"
                  />

                  <h3 className="font-black text-slate-950">
                    Customer
                  </h3>

                </div>

                <div className="mt-4 grid gap-6 sm:grid-cols-2">

                  <ReceiptField
                    label="Member"
                    value={
                      memberName
                    }
                  />

                  <ReceiptField
                    label="Account Number"
                    value={
                      accountNumber
                    }
                  />

                </div>

              </div>

              {/* TRANSACTION INFORMATION */}

              <div className="mt-8 border-t border-slate-100 pt-7">

                <div className="flex items-center gap-2">

                  <ReceiptText
                    size={18}
                    className="text-blue-700"
                  />

                  <h3 className="font-black text-slate-950">
                    Transaction Information
                  </h3>

                </div>

                <div className="mt-5 grid gap-6 sm:grid-cols-2">

                  <ReceiptField
                    label="Transaction Type"
                    value={
                      transactionType
                    }
                  />

                  <ReceiptField
                    label="Amount"
                    value={
                      amount
                    }
                    strong
                  />

                  <ReceiptField
                    label="Fee"
                    value={money(
                      fee
                    )}
                  />

                  <ReceiptField
                    label="Net Amount"
                    value={money(
                      netAmount
                    )}
                    strong
                  />

                  <ReceiptField
                    label="Source"
                    value={pretty(
                      transaction.source_type
                    )}
                  />

                  <ReceiptField
                    label="Destination"
                    value={pretty(
                      transaction.destination_type
                    )}
                  />

                  <ReceiptField
                    label="Reference"
                    value={
                      reference
                    }
                  />

                  <ReceiptField
                    label="Transaction Date"
                    value={formatDateTime(
                      transaction.created_at
                    )}
                  />

                </div>

              </div>

              {/* DESCRIPTION */}

              {textValue(
                transaction.description
              ) && (
                <div className="mt-7 rounded-2xl bg-slate-50 p-5">

                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {textValue(
                      transaction.description
                    )}
                  </p>

                </div>
              )}

              {/* ==================================================
                  MANUAL / POS DETAILS
              ================================================== */}

              {manual && (
                <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">

                  <div className="flex items-center gap-2">

                    <Smartphone
                      size={18}
                      className="text-amber-700"
                    />

                    <p className="font-black text-amber-900">
                      Manual / POS Transaction
                    </p>

                  </div>

                  <p className="mt-2 text-xs leading-5 text-amber-700">
                    This transaction was manually entered by an authorized GROW CIG staff member.
                  </p>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">

                    <ReceiptField
                      label="Processed By"
                      value={
                        textValue(
                          processingStaff?.full_name
                        ) ||
                        "Authorized Staff"
                      }
                    />

                    <ReceiptField
                      label="Original Transaction Time"
                      value={formatDateTime(
                        transaction.original_transaction_at
                      )}
                    />

                  </div>

                  <div className="mt-5">

                    <ReceiptField
                      label="Manual Entry Reason"
                      value={
                        textValue(
                          transaction.manual_reason
                        ) ||
                        "Ã¢â‚¬â€"
                      }
                    />

                  </div>

                </div>
              )}

              {/* FOOTER */}

              <div className="mt-8 border-t border-slate-200 pt-6 text-center">

                <p className="text-sm font-black text-slate-900">
                  Thank you for saving with GROW CIG.
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Empowering People, Businesses and Communities Together.
                </p>

                <p className="mt-4 text-[11px] text-slate-400">
                  Transaction Reference:{" "}
                  {reference}
                </p>

              </div>

            </section>

          </div>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <aside className="space-y-6 print:hidden">

                        {/* PENDING DEPOSIT APPROVAL */}

            {isPendingDeposit && (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                    <ShieldCheck
                      size={20}
                    />
                  </div>

                  <div>
                    <h2 className="font-black text-amber-950">
                      Pending Deposit
                    </h2>

                    <p className="mt-1 text-xs text-amber-700">
                      Verify the payment before approving.
                    </p>
                  </div>

                </div>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4">

                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Amount to Credit
                  </p>

                  <p className="mt-2 text-xl font-black text-slate-950">
                    {amount}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Destination:{" "}
                    <span className="font-black text-slate-700">
                      {pretty(
                        transaction.destination_type
                      )}
                    </span>
                  </p>

                  <p className="mt-1 break-all text-xs text-slate-500">
                    Reference:{" "}
                    <span className="font-bold text-blue-700">
                      {reference}
                    </span>
                  </p>

                </div>

                <div className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-xs font-semibold leading-5 text-amber-900">
                  Only approve after confirming that the money was actually received.
                </div>

                {depositError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                    {depositError}
                  </div>
                )}

                {depositSuccess && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                    {depositSuccess}
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    approveDeposit
                  }
                  disabled={
                    processingDeposit
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check
                    size={18}
                  />

                  {processingDeposit
                    ? "Approving Deposit..."
                    : "Approve Deposit"}
                </button>

              </section>
            )}

{/* SEND RECEIPT */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">

                  <ReceiptText
                    size={20}
                  />

                </div>

                <div>

                  <h2 className="font-black text-slate-950">
                    Send Receipt
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Send this transaction to the customer.
                  </p>

                </div>

              </div>

              <div className="mt-5 space-y-3">

                {/* WHATSAPP */}

                <button
                  type="button"
                  onClick={
                    sendWhatsApp
                  }
                  className="flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >

                  <span className="flex items-center gap-2">

                    <MessageCircle
                      size={18}
                    />

                    Send by WhatsApp

                  </span>

                  <Share2
                    size={15}
                  />

                </button>

                {/* EMAIL */}

                <button
                  type="button"
                  onClick={
                    sendEmail
                  }
                  disabled={
                    !email
                  }
                  className="flex w-full items-center justify-between rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                >

                  <span className="flex items-center gap-2">

                    <Mail
                      size={18}
                    />

                    Send by Email

                  </span>

                  <Share2
                    size={15}
                  />

                </button>

                {/* SHARE */}

                <button
                  type="button"
                  onClick={
                    shareReceipt
                  }
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >

                  <Share2
                    size={18}
                  />

                  Share Receipt

                </button>

                {/* COPY */}

                <button
                  type="button"
                  onClick={
                    copyReceipt
                  }
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >

                  {copied ? (
                    <Check
                      size={18}
                      className="text-emerald-600"
                    />
                  ) : (
                    <Clipboard
                      size={18}
                    />
                  )}

                  {copied
                    ? "Receipt Copied"
                    : "Copy Receipt"}

                </button>

                {/* PRINT */}

                <button
                  type="button"
                  onClick={
                    printReceipt
                  }
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >

                  <Printer
                    size={18}
                  />

                  Print Receipt

                </button>

              </div>

              {/* CONTACT */}

              <div className="mt-5 border-t border-slate-100 pt-5">

                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Customer Contact
                </p>

                <div className="mt-3 space-y-2">

                  <p className="text-sm font-bold text-slate-800">
                    {phone ||
                      "No phone saved"}
                  </p>

                  <p className="break-all text-sm text-slate-500">
                    {email ||
                      "No email saved"}
                  </p>

                </div>

              </div>

            </section>

            {/* MEMBER */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">

                  <UserRound
                    size={20}
                  />

                </div>

                <h2 className="font-black text-slate-950">
                  Member
                </h2>

              </div>

              <p className="mt-5 text-lg font-black text-slate-950">
                {memberName}
              </p>

              <p className="mt-1 text-sm font-bold text-blue-700">
                {accountNumber}
              </p>

              {phone && (
                <p className="mt-3 text-sm text-slate-500">
                  {phone}
                </p>
              )}

              {email && (
                <p className="mt-1 break-all text-sm text-slate-500">
                  {email}
                </p>
              )}

              {textValue(
                transaction.user_id
              ) && (
                <Link
                  href={`/members/${textValue(
                    transaction.user_id
                  )}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                >
                  Open Member Profile
                </Link>
              )}

            </section>

            {/* TRANSACTION ID */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6">

              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Transaction ID
              </p>

              <p className="mt-3 break-all text-xs font-semibold leading-5 text-slate-600">
                {textValue(
                  transaction.id
                )}
              </p>

            </section>

          </aside>

        </section>

      </div>

    </main>
  );
}

// ================================================================
// SUMMARY CARD
// ================================================================

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;

  icon: ComponentType<{
    size?: number;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">

      <div className="flex items-center justify-between gap-4">

        <div>

          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-xl font-black text-slate-950">
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
// RECEIPT FIELD
// ================================================================

function ReceiptField({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>

      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 break-words ${
          strong
            ? "text-lg font-black text-slate-950"
            : "text-sm font-bold text-slate-800"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

// ================================================================
// STATUS BADGE
// ================================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  let styles =
    "bg-slate-100 text-slate-600";

  if (
    [
      "successful",
      "success",
      "completed",
      "approved",
      "paid",
    ].includes(
      normalized
    )
  ) {
    styles =
      "bg-emerald-50 text-emerald-700";
  } else if (
    normalized ===
    "pending"
  ) {
    styles =
      "bg-amber-50 text-amber-700";
  } else if (
    [
      "failed",
      "rejected",
      "cancelled",
    ].includes(
      normalized
    )
  ) {
    styles =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${styles}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}