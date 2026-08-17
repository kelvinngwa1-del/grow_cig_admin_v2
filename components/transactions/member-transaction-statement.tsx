"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  ComponentType,
} from "react";

import Link from "next/link";

import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpCircle,
  Banknote,
  CalendarDays,
  Check,
  Clipboard,
  Clock3,
  Download,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  Share2,
  UserRound,
  WalletCards,
} from "lucide-react";

type RecordValue =
  Record<string, unknown>;

type Props = {
  member:
    RecordValue;

  transactions:
    RecordValue[];

  staffName: string;
  staffRole: string;
};

type DirectionFilter =
  | "all"
  | "money_in"
  | "money_out"
  | "internal"
  | "pending";

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
    return "—";
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

function formatDate(
  value: unknown
) {
  if (
    typeof value !==
      "string" ||
    !value
  ) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
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
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
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

function isSuccessful(
  status: unknown
) {
  const value =
    textValue(status)
      .toLowerCase();

  return [
    "successful",
    "success",
    "completed",
    "approved",
    "paid",
  ].includes(
    value
  );
}

function isPending(
  status: unknown
) {
  return (
    textValue(status)
      .toLowerCase() ===
    "pending"
  );
}

function transactionDirection(
  transaction:
    RecordValue
):
  | "money_in"
  | "money_out"
  | "internal"
  | "other" {
  const type =
    textValue(
      transaction.type
    ).toLowerCase();

  if (
    [
      "deposit",
      "manual_deposit",
      "loan_disbursement",
    ].includes(type)
  ) {
    return "money_in";
  }

  if (
    [
      "withdrawal",
      "loan_repayment",
      "manual_debit",
    ].includes(type)
  ) {
    return "money_out";
  }

  if (
    type ===
    "goal_transfer"
  ) {
    return "internal";
  }

  return "other";
}

function normalizeWhatsAppPhone(
  phone: string
) {
  let digits =
    phone.replace(
      /\D/g,
      ""
    );

  if (
    digits.startsWith(
      "00237"
    )
  ) {
    digits =
      digits.substring(
        2
      );
  }

  if (
    digits.length ===
      9 &&
    digits.startsWith(
      "6"
    )
  ) {
    digits =
      `237${digits}`;
  }

  return digits;
}

function dateInputValue(
  value: unknown
) {
  const text =
    textValue(value);

  if (!text) {
    return "";
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

export default function MemberTransactionStatement({
  member,
  transactions,
  staffName,
  staffRole,
}: Props) {
  const memberId =
    textValue(
      member.id
    );

  const memberName =
    textValue(
      member.full_name
    ) ||
    "Unknown Member";

  const accountNumber =
    textValue(
      member.account_number
    ) ||
    "—";

  const phone =
    textValue(
      member.phone
    );

  const email =
    textValue(
      member.email
    );

  // ============================================================
  // DEFAULT DATE RANGE
  // ============================================================

  const oldestDate =
    useMemo(() => {
      if (
        transactions.length ===
        0
      ) {
        return "";
      }

      const sorted =
        [...transactions]
          .filter(
            (transaction) =>
              textValue(
                transaction.created_at
              )
          )
          .sort(
            (a, b) =>
              new Date(
                textValue(
                  a.created_at
                )
              ).getTime() -
              new Date(
                textValue(
                  b.created_at
                )
              ).getTime()
          );

      return dateInputValue(
        sorted[0]
          ?.created_at
      );
    }, [
      transactions,
    ]);

  const newestDate =
    useMemo(() => {
      if (
        transactions.length ===
        0
      ) {
        return "";
      }

      const sorted =
        [...transactions]
          .filter(
            (transaction) =>
              textValue(
                transaction.created_at
              )
          )
          .sort(
            (a, b) =>
              new Date(
                textValue(
                  b.created_at
                )
              ).getTime() -
              new Date(
                textValue(
                  a.created_at
                )
              ).getTime()
          );

      return dateInputValue(
        sorted[0]
          ?.created_at
      );
    }, [
      transactions,
    ]);

  const [
    fromDate,
    setFromDate,
  ] = useState(
    oldestDate
  );

  const [
    toDate,
    setToDate,
  ] = useState(
    newestDate
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    directionFilter,
    setDirectionFilter,
  ] =
    useState<DirectionFilter>(
      "all"
    );

  const [
    copied,
    setCopied,
  ] = useState(false);

  // ============================================================
  // FILTERED TRANSACTIONS
  // ============================================================

  const filteredTransactions =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const from =
        fromDate
          ? new Date(
              `${fromDate}T00:00:00`
            )
          : null;

      const to =
        toDate
          ? new Date(
              `${toDate}T23:59:59.999`
            )
          : null;

      return transactions
        .filter(
          (transaction) => {
            const createdAt =
              textValue(
                transaction.created_at
              );

            if (
              createdAt
            ) {
              const date =
                new Date(
                  createdAt
                );

              if (
                from &&
                date < from
              ) {
                return false;
              }

              if (
                to &&
                date > to
              ) {
                return false;
              }
            }

            if (
              directionFilter ===
                "pending" &&
              !isPending(
                transaction.status
              )
            ) {
              return false;
            }

            if (
              directionFilter !==
                "all" &&
              directionFilter !==
                "pending"
            ) {
              if (
                transactionDirection(
                  transaction
                ) !==
                directionFilter
              ) {
                return false;
              }
            }

            if (!query) {
              return true;
            }

            const searchable =
              [
                transaction.type,
                transaction.status,
                transaction.reference,
                transaction.description,
                transaction.source_type,
                transaction.destination_type,
                transaction.manual_reason,
                transaction.staff_name,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(
              query
            );
          }
        )
        .sort(
          (a, b) =>
            new Date(
              textValue(
                b.created_at
              )
            ).getTime() -
            new Date(
              textValue(
                a.created_at
              )
            ).getTime()
        );
    }, [
      transactions,
      fromDate,
      toDate,
      search,
      directionFilter,
    ]);

  // ============================================================
  // TOTALS
  // ============================================================

  const totals =
    useMemo(() => {
      let deposits = 0;
      let loanDisbursements =
        0;
      let withdrawals = 0;
      let loanRepayments =
        0;
      let manualDebits =
        0;
      let internalTransfers =
        0;
      let pendingAmount =
        0;
      let totalFees = 0;

      let successfulCount =
        0;
      let pendingCount = 0;

      for (
        const transaction
        of filteredTransactions
      ) {
        const type =
          textValue(
            transaction.type
          ).toLowerCase();

        const amount =
          numberValue(
            transaction.amount
          );

        const fee =
          numberValue(
            transaction.fee
          );

        if (
          isPending(
            transaction.status
          )
        ) {
          pendingCount +=
            1;

          pendingAmount +=
            amount;

          continue;
        }

        if (
          !isSuccessful(
            transaction.status
          )
        ) {
          continue;
        }

        successfulCount +=
          1;

        totalFees += fee;

        if (
          type ===
            "deposit" ||
          type ===
            "manual_deposit"
        ) {
          deposits +=
            amount;
        } else if (
          type ===
          "loan_disbursement"
        ) {
          loanDisbursements +=
            amount;
        } else if (
          type ===
          "withdrawal"
        ) {
          withdrawals +=
            amount;
        } else if (
          type ===
          "loan_repayment"
        ) {
          loanRepayments +=
            amount;
        } else if (
          type ===
          "manual_debit"
        ) {
          manualDebits +=
            amount;
        } else if (
          type ===
          "goal_transfer"
        ) {
          internalTransfers +=
            amount;
        }
      }

      const moneyIn =
        deposits +
        loanDisbursements;

      const moneyOut =
        withdrawals +
        loanRepayments +
        manualDebits;

      const netMovement =
        moneyIn -
        moneyOut -
        totalFees;

      return {
        deposits,
        loanDisbursements,
        withdrawals,
        loanRepayments,
        manualDebits,
        internalTransfers,
        pendingAmount,
        totalFees,
        successfulCount,
        pendingCount,
        moneyIn,
        moneyOut,
        netMovement,
      };
    }, [
      filteredTransactions,
    ]);

  // ============================================================
  // PERIOD
  // ============================================================

  const statementPeriod =
    fromDate || toDate
      ? `${fromDate ? formatDate(fromDate) : "Beginning"} - ${
          toDate
            ? formatDate(toDate)
            : "Present"
        }`
      : "All Transactions";

  // ============================================================
  // TEXT RECEIPT
  // ============================================================

  const statementText =
    useMemo(() => {
      const transactionLines =
        filteredTransactions
          .map(
            (
              transaction,
              index
            ) => {
              const type =
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

              const reference =
                textValue(
                  transaction.reference
                ) ||
                "—";

              const date =
                formatDateTime(
                  transaction.created_at
                );

              return `${index + 1}. ${date}
${type}
Amount: ${amount}
Status: ${status}
Reference: ${reference}`;
            }
          )
          .join(
            "\n\n"
          );

      return `GROW COMMON INITIATIVE GROUP
MEMBER TRANSACTION STATEMENT

Member: ${memberName}
Account Number: ${accountNumber}
Statement Period: ${statementPeriod}

SUMMARY

Total Transactions: ${filteredTransactions.length}
Successful Transactions: ${totals.successfulCount}
Pending Transactions: ${totals.pendingCount}

Successful Deposits: ${money(totals.deposits)}
Loan Disbursements: ${money(totals.loanDisbursements)}

TOTAL MONEY IN: ${money(totals.moneyIn)}

Successful Withdrawals: ${money(totals.withdrawals)}
Loan Repayments: ${money(totals.loanRepayments)}
Manual Debits: ${money(totals.manualDebits)}

TOTAL MONEY OUT: ${money(totals.moneyOut)}

Internal Goal Transfers: ${money(totals.internalTransfers)}
Transaction Fees: ${money(totals.totalFees)}
Pending Amount: ${money(totals.pendingAmount)}

NET MOVEMENT: ${money(totals.netMovement)}

TRANSACTION HISTORY

${transactionLines || "No transactions found for this period."}

Generated by: ${staffName}

Thank you for saving with GROW CIG.

Empowering People, Businesses and Communities Together.`;
    }, [
      filteredTransactions,
      memberName,
      accountNumber,
      statementPeriod,
      totals,
      staffName,
    ]);

  // ============================================================
  // ACTIONS
  // ============================================================

  async function copyStatement() {
    try {
      await navigator.clipboard.writeText(
        statementText
      );

      setCopied(
        true
      );

      window.setTimeout(
        () =>
          setCopied(
            false
          ),
        2000
      );
    } catch {
      window.alert(
        "Unable to copy statement."
      );
    }
  }

  async function shareStatement() {
    if (
      navigator.share
    ) {
      try {
        await navigator.share({
          title:
            "GROW CIG Member Transaction Statement",

          text:
            statementText,
        });

        return;
      } catch {
        return;
      }
    }

    await copyStatement();

    window.alert(
      "Statement copied. You can paste and send it."
    );
  }

  function sendWhatsApp() {
    const normalizedPhone =
      normalizeWhatsAppPhone(
        phone
      );

    const message =
      encodeURIComponent(
        statementText
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

  function sendEmail() {
    if (!email) {
      window.alert(
        "This member does not have an email address saved."
      );

      return;
    }

    const subject =
      encodeURIComponent(
        `GROW CIG Transaction Statement - ${accountNumber}`
      );

    const body =
      encodeURIComponent(
        statementText
      );

    window.location.href =
      `mailto:${email}?subject=${subject}&body=${body}`;
  }

  function printStatement() {
    window.print();
  }

  function resetFilters() {
    setFromDate(
      oldestDate
    );

    setToDate(
      newestDate
    );

    setSearch("");

    setDirectionFilter(
      "all"
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8 print:hidden">

        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href={`/members/${memberId}`}
              className="inline-flex items-center gap-2 text-xs font-black text-blue-700 hover:underline"
            >
              <ArrowLeft
                size={15}
              />

              Back to Member
            </Link>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Member Transaction Statement
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review and send the customer&apos;s complete transaction history.
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

      <div className="mx-auto max-w-[1600px] p-5 md:p-8 print:max-w-none print:p-0">

        {/* ====================================================
            MEMBER
        ==================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 print:rounded-none print:border-0 print:px-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 print:hidden">

                <UserRound
                  size={26}
                />

              </div>

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  GROW CIG
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {memberName}
                </h2>

                <p className="mt-1 text-sm font-bold text-blue-700">
                  {accountNumber}
                </p>

              </div>

            </div>

            <div className="text-sm md:text-right">

              <p className="font-bold text-slate-700">
                {statementPeriod}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {filteredTransactions.length} transaction
                {filteredTransactions.length ===
                1
                  ? ""
                  : "s"}
              </p>

            </div>

          </div>

        </section>

        {/* ====================================================
            FILTERS
        ==================================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 print:hidden">

          <div className="grid gap-4 xl:grid-cols-[auto_auto_1fr_auto_auto]">

            <div>

              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                From
              </label>

              <input
                type="date"
                value={
                  fromDate
                }
                onChange={(
                  event
                ) =>
                  setFromDate(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
              />

            </div>

            <div>

              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                To
              </label>

              <input
                type="date"
                value={
                  toDate
                }
                onChange={(
                  event
                ) =>
                  setToDate(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
              />

            </div>

            <div>

              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                Search
              </label>

              <div className="relative">

                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Type, reference, description..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-600"
                />

              </div>

            </div>

            <div>

              <label className="mb-2 block text-xs font-black uppercase text-slate-400">
                Category
              </label>

              <select
                value={
                  directionFilter
                }
                onChange={(
                  event
                ) =>
                  setDirectionFilter(
                    event.target
                      .value as DirectionFilter
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none"
              >

                <option value="all">
                  All Transactions
                </option>

                <option value="money_in">
                  Money In
                </option>

                <option value="money_out">
                  Money Out
                </option>

                <option value="internal">
                  Internal Transfers
                </option>

                <option value="pending">
                  Pending
                </option>

              </select>

            </div>

            <div className="flex items-end">

              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw
                  size={16}
                />

                Reset
              </button>

            </div>

          </div>

        </section>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">

          <SummaryCard
            label="Money In"
            value={money(
              totals.moneyIn
            )}
            icon={
              ArrowDownCircle
            }
          />

          <SummaryCard
            label="Money Out"
            value={money(
              totals.moneyOut
            )}
            icon={
              ArrowUpCircle
            }
          />

          <SummaryCard
            label="Internal Transfers"
            value={money(
              totals.internalTransfers
            )}
            icon={
              ArrowRightLeft
            }
          />

          <SummaryCard
            label="Net Movement"
            value={money(
              totals.netMovement
            )}
            icon={
              Banknote
            }
          />

        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 print:grid-cols-3">

          <MiniCard
            label="Deposits"
            value={money(
              totals.deposits
            )}
          />

          <MiniCard
            label="Loan Received"
            value={money(
              totals.loanDisbursements
            )}
          />

          <MiniCard
            label="Withdrawals"
            value={money(
              totals.withdrawals
            )}
          />

          <MiniCard
            label="Loan Repayments"
            value={money(
              totals.loanRepayments
            )}
          />

          <MiniCard
            label="Fees"
            value={money(
              totals.totalFees
            )}
          />

          <MiniCard
            label="Pending"
            value={money(
              totals.pendingAmount
            )}
          />

        </section>

        {/* ====================================================
            ACTIONS
        ==================================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 print:hidden">

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={
                sendWhatsApp
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
            >
              <MessageCircle
                size={18}
              />

              Send WhatsApp
            </button>

            <button
              type="button"
              onClick={
                sendEmail
              }
              disabled={
                !email
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-40"
            >
              <Mail
                size={18}
              />

              Email Statement
            </button>

            <button
              type="button"
              onClick={
                shareStatement
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Share2
                size={18}
              />

              Share
            </button>

            <button
              type="button"
              onClick={
                copyStatement
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              {copied ? (
                <Check
                  size={18}
                />
              ) : (
                <Clipboard
                  size={18}
                />
              )}

              {copied
                ? "Copied"
                : "Copy Statement"}
            </button>

            <button
              type="button"
              onClick={
                printStatement
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Printer
                size={18}
              />

              Print / Save PDF
            </button>

          </div>

        </section>

        {/* ====================================================
            TRANSACTIONS
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white print:rounded-none">

          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

            <div>

              <h2 className="text-lg font-black text-slate-950">
                Transaction History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredTransactions.length} record
                {filteredTransactions.length ===
                1
                  ? ""
                  : "s"}
              </p>

            </div>

            <ReceiptText className="text-blue-700 print:hidden" />

          </div>

          {filteredTransactions.length ===
          0 ? (
            <div className="p-12 text-center">

              <FileText
                size={30}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 font-black text-slate-900">
                No Transactions
              </p>

              <p className="mt-1 text-sm text-slate-500">
                No transactions match this statement period.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase text-slate-400">

                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4">
                      Type
                    </th>

                    <th className="px-5 py-4">
                      From
                    </th>

                    <th className="px-5 py-4">
                      To
                    </th>

                    <th className="px-5 py-4">
                      Amount
                    </th>

                    <th className="px-5 py-4">
                      Reference
                    </th>

                    <th className="px-5 py-4">
                      Entry
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredTransactions.map(
                    (
                      transaction
                    ) => (
                      <StatementRow
                        key={
                          textValue(
                            transaction.id
                          )
                        }
                        transaction={
                          transaction
                        }
                      />
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">

            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">

              <p className="font-semibold text-slate-500">
                Statement Period:{" "}
                <span className="font-black text-slate-900">
                  {statementPeriod}
                </span>
              </p>

              <p className="font-semibold text-slate-500">
                Generated by:{" "}
                <span className="font-black text-slate-900">
                  {staffName}
                </span>
              </p>

            </div>

          </div>

        </section>

        <footer className="py-8 text-center">

          <p className="text-sm font-black text-slate-900">
            GROW COMMON INITIATIVE GROUP
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Empowering People, Businesses and Communities Together.
          </p>

        </footer>

      </div>

    </main>
  );
}

// ================================================================
// STATEMENT ROW
// ================================================================

function StatementRow({
  transaction,
}: {
  transaction:
    RecordValue;
}) {
  const manual =
    boolValue(
      transaction.manual_entry
    );

  return (
    <tr className="border-b border-slate-100 last:border-0">

      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
        {formatDateTime(
          transaction.created_at
        )}
      </td>

      <td className="px-5 py-4 text-sm font-black text-slate-900">
        {pretty(
          transaction.type
        )}
      </td>

      <td className="px-5 py-4 text-sm text-slate-600">
        {pretty(
          transaction.source_type
        )}
      </td>

      <td className="px-5 py-4 text-sm text-slate-600">
        {pretty(
          transaction.destination_type
        )}
      </td>

      <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">
        {money(
          transaction.amount
        )}
      </td>

      <td className="max-w-44 px-5 py-4">

        <p className="truncate text-xs font-bold text-blue-700">
          {textValue(
            transaction.reference
          ) ||
            "—"}
        </p>

      </td>

      <td className="px-5 py-4">

        {manual ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
            Manual / POS
          </span>
        ) : (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
            Automatic
          </span>
        )}

      </td>

      <td className="px-5 py-4">

        <StatusBadge
          status={
            textValue(
              transaction.status
            )
          }
        />

      </td>

    </tr>
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

        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 print:hidden">

          <Icon
            size={21}
          />

        </div>

      </div>

    </div>
  );
}

// ================================================================
// MINI CARD
// ================================================================

function MiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <p className="text-xs font-black uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-2 font-black text-slate-900">
        {value}
      </p>

    </div>
  );
}

// ================================================================
// STATUS
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
      className={`rounded-full px-2.5 py-1 text-xs font-black ${styles}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}