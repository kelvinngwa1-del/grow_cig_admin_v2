"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  FileText,
  Loader2,
  Printer,
  RefreshCcw,
  TriangleAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type StatementRow = {
  transaction_id: string;

  date:
    | string
    | null;

  local_date:
    | string
    | null;

  reference:
    | string
    | null;

  type:
    | string
    | null;

  status:
    | string
    | null;

  description:
    | string
    | null;

  source_type:
    | string
    | null;

  destination_type:
    | string
    | null;

  amount:
    | number
    | string
    | null;

  fee:
    | number
    | string
    | null;

  net_amount:
    | number
    | string
    | null;

  payment_method:
    | string
    | null;

  manual_entry:
    | boolean
    | null;

  classification:
    | string
    | null;

  debit:
    | number
    | string
    | null;

  credit:
    | number
    | string
    | null;

  balance_effect:
    | number
    | string
    | null;

  running_balance:
    | number
    | string
    | null;
};

type StatementData = {
  member: {
    user_id: string;

    full_name:
      | string
      | null;

    account_number:
      | string
      | null;

    email:
      | string
      | null;

    phone:
      | string
      | null;

    membership_start_date:
      | string
      | null;
  };

  period: {
    from:
      | string
      | null;

    to:
      | string
      | null;

    timezone:
      | string
      | null;
  };

  summary: {
    opening_balance:
      | number
      | string
      | null;

    total_credits:
      | number
      | string
      | null;

    total_debits:
      | number
      | string
      | null;

    net_change:
      | number
      | string
      | null;

    closing_balance:
      | number
      | string
      | null;

    current_wallet_available:
      | number
      | string
      | null;

    current_wallet_locked:
      | number
      | string
      | null;

    current_goal_savings:
      | number
      | string
      | null;

    current_total_funds:
      | number
      | string
      | null;

    outstanding_loan_balance:
      | number
      | string
      | null;

    registration_fee_due:
      | number
      | string
      | null;

    registration_fee_paid:
      | number
      | string
      | null;

    registration_fee_remaining:
      | number
      | string
      | null;
  };

  transactions:
    StatementRow[];

  unclassified_successful_types:
    string[];
};

type Props = {
  memberId: string;
  memberName: string;
};

function numberValue(
  value:
    | number
    | string
    | null
    | undefined
) {
  const parsed =
    Number(
      value ?? 0
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function money(
  value:
    | number
    | string
    | null
    | undefined
) {
  return `${new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 2,
    }
  ).format(
    numberValue(value)
  )} CFA`;
}

function pretty(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
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
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-GB",
    {
      timeZone:
        "Africa/Douala",

      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}

function escapeHtml(
  value: unknown
) {
  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    (character) => {
      const entities:
        Record<
          string,
          string
        > = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };

      return (
        entities[
          character
        ] ??
        character
      );
    }
  );
}

export default function AccountStatement({
  memberId,
  memberName,
}: Props) {

  const [
    fromDate,
    setFromDate,
  ] =
    useState("");

  const [
    toDate,
    setToDate,
  ] =
    useState("");

  const [
    statement,
    setStatement,
  ] =
    useState<
      StatementData |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");


  async function loadStatement(
    from:
      string = fromDate,
    to:
      string = toDate
  ) {

    setError("");

    if (
      from &&
      to &&
      to < from
    ) {
      setError(
        "End date cannot be before start date."
      );

      return;
    }

    setLoading(true);

    try {

      const supabase =
        createClient();

      const {
        data,
        error:
          rpcError,
      } =
        await supabase.rpc(
          "get_admin_member_statement",
          {
            p_user_id:
              memberId,

            p_from:
              from ||
              null,

            p_to:
              to ||
              null,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error(
          "No statement data was returned."
        );
      }

      setStatement(
        data as StatementData
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load account statement."
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {

    void loadStatement(
      "",
      ""
    );

    // Member ID change should reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    memberId,
  ]);


  function showAllTime() {

    setFromDate("");
    setToDate("");

    void loadStatement(
      "",
      ""
    );
  }


  function printStatement() {

    if (!statement) {
      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=800"
      );

    if (!printWindow) {

      setError(
        "Your browser blocked the print window. Allow pop-ups and try again."
      );

      return;
    }

    const rows =
      statement.transactions
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(formatDate(row.date))}</td>
              <td>${escapeHtml(row.reference ?? "—")}</td>
              <td>
                <strong>${escapeHtml(pretty(row.type))}</strong>
                <div class="small">
                  ${escapeHtml(row.description ?? "")}
                </div>
              </td>
              <td>${escapeHtml(pretty(row.status))}</td>
              <td class="money">${escapeHtml(money(row.amount))}</td>
              <td class="money">${escapeHtml(money(row.fee))}</td>
              <td class="money">${numberValue(row.debit) > 0 ? escapeHtml(money(row.debit)) : "—"}</td>
              <td class="money">${numberValue(row.credit) > 0 ? escapeHtml(money(row.credit)) : "—"}</td>
              <td class="money">${escapeHtml(money(row.running_balance))}</td>
            </tr>
          `
        )
        .join("");

    const summary =
      statement.summary;

    const periodLabel =
      statement.period.from ||
      statement.period.to
        ? `${statement.period.from ?? "Beginning"} to ${statement.period.to ?? "Present"}`
        : "All Time";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Account Statement - ${escapeHtml(statement.member.full_name ?? memberName)}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 32px;
            font-size: 12px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 18px;
            margin-bottom: 22px;
          }

          h1 {
            margin: 0;
            font-size: 24px;
          }

          h2 {
            margin: 4px 0 0;
            font-size: 13px;
            font-weight: normal;
          }

          .company {
            font-size: 14px;
            font-weight: 700;
          }

          .meta {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px 28px;
            margin-bottom: 22px;
          }

          .meta div {
            border-bottom: 1px solid #e2e8f0;
            padding: 7px 0;
          }

          .label {
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 24px;
          }

          .summary-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px;
          }

          .summary-card strong {
            display: block;
            margin-top: 5px;
            font-size: 14px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            text-align: left;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 8px 6px;
            font-size: 10px;
            text-transform: uppercase;
          }

          td {
            border: 1px solid #e2e8f0;
            padding: 8px 6px;
            vertical-align: top;
          }

          .money {
            text-align: right;
            white-space: nowrap;
          }

          .small {
            margin-top: 3px;
            color: #64748b;
            font-size: 10px;
          }

          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            color: #64748b;
            font-size: 10px;
          }

          @media print {
            body {
              padding: 12px;
            }

            @page {
              size: A4 landscape;
              margin: 10mm;
            }
          }
        </style>
      </head>

      <body>

        <div class="header">
          <div>
            <div class="company">
              GROW COMMON INITIATIVE GROUP
            </div>

            <h1>
              Member Account Statement
            </h1>

            <h2>
              Statement Period: ${escapeHtml(periodLabel)}
            </h2>
          </div>

          <div>
            Generated:
            ${escapeHtml(new Date().toLocaleString("en-GB"))}
          </div>
        </div>

        <div class="meta">

          <div>
            <div class="label">Member Name</div>
            ${escapeHtml(statement.member.full_name ?? memberName)}
          </div>

          <div>
            <div class="label">Account Number</div>
            ${escapeHtml(statement.member.account_number ?? "—")}
          </div>

          <div>
            <div class="label">Phone</div>
            ${escapeHtml(statement.member.phone ?? "—")}
          </div>

          <div>
            <div class="label">Membership Start Date</div>
            ${escapeHtml(statement.member.membership_start_date ?? "—")}
          </div>

        </div>

        <div class="summary">

          <div class="summary-card">
            <div class="label">Opening Balance</div>
            <strong>${escapeHtml(money(summary.opening_balance))}</strong>
          </div>

          <div class="summary-card">
            <div class="label">Total Credits</div>
            <strong>${escapeHtml(money(summary.total_credits))}</strong>
          </div>

          <div class="summary-card">
            <div class="label">Total Debits</div>
            <strong>${escapeHtml(money(summary.total_debits))}</strong>
          </div>

          <div class="summary-card">
            <div class="label">Closing Balance</div>
            <strong>${escapeHtml(money(summary.closing_balance))}</strong>
          </div>

        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Description</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Fee</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Running Balance</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows ||
              `
                <tr>
                  <td colspan="9">
                    No transactions found for this period.
                  </td>
                </tr>
              `
            }
          </tbody>
        </table>

        <div class="footer">
          Current Funds Snapshot:
          Wallet Available ${escapeHtml(money(summary.current_wallet_available))},
          Wallet Locked ${escapeHtml(money(summary.current_wallet_locked))},
          Goal Savings ${escapeHtml(money(summary.current_goal_savings))},
          Total Funds ${escapeHtml(money(summary.current_total_funds))}.
          Outstanding Loan: ${escapeHtml(money(summary.outstanding_loan_balance))}.
        </div>

      </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(
      () => {
        printWindow.print();
      },
      300
    );
  }


  const summary =
    statement?.summary;


  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div className="flex items-start gap-3">

          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <FileText
              size={20}
            />
          </div>

          <div>

            <h2 className="text-lg font-black text-slate-950">
              Account Statement
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Complete member financial activity with credits, debits, fees and running balance.
            </p>

          </div>

        </div>

        <button
          type="button"
          disabled={
            !statement ||
            loading
          }
          onClick={
            printStatement
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer
            size={17}
          />

          Print / Save PDF
        </button>

      </div>


      {/* FILTERS */}

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto_auto]">

        <div>

          <label className="text-xs font-black uppercase tracking-wide text-slate-500">
            From Date
          </label>

          <div className="relative mt-2">

            <CalendarDays
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="date"
              value={
                fromDate
              }
              onChange={(
                event
              ) =>
                setFromDate(
                  event.target.value
                )
              }
              className="form-input pl-10"
            />

          </div>

        </div>


        <div>

          <label className="text-xs font-black uppercase tracking-wide text-slate-500">
            To Date
          </label>

          <div className="relative mt-2">

            <CalendarDays
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="date"
              value={
                toDate
              }
              onChange={(
                event
              ) =>
                setToDate(
                  event.target.value
                )
              }
              className="form-input pl-10"
            />

          </div>

        </div>


        <div className="flex items-end">

          <button
            type="button"
            disabled={
              loading
            }
            onClick={() =>
              void loadStatement()
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-50 md:w-auto"
          >
            {loading ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <RefreshCcw
                size={17}
              />
            )}

            Apply
          </button>

        </div>


        <div className="flex items-end">

          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              showAllTime
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 md:w-auto"
          >
            All Time
          </button>

        </div>

      </div>


      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}


      {statement &&
        statement.unclassified_successful_types
          ?.length >
          0 && (

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">

          <TriangleAlert
            size={18}
            className="mt-0.5 shrink-0 text-amber-700"
          />

          <div>

            <p className="text-sm font-black text-amber-900">
              Unclassified transaction type detected
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Review before using this statement officially:{" "}
              {
                statement
                  .unclassified_successful_types
                  .join(", ")
              }
            </p>

          </div>

        </div>

      )}


      {/* SUMMARY */}

      {summary && (

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="Opening Balance"
            value={
              money(
                summary.opening_balance
              )
            }
          />

          <SummaryCard
            label="Total Credits"
            value={
              money(
                summary.total_credits
              )
            }
          />

          <SummaryCard
            label="Total Debits"
            value={
              money(
                summary.total_debits
              )
            }
          />

          <SummaryCard
            label="Closing Balance"
            value={
              money(
                summary.closing_balance
              )
            }
          />

          <SummaryCard
            label="Wallet Available"
            value={
              money(
                summary.current_wallet_available
              )
            }
          />

          <SummaryCard
            label="Wallet Locked"
            value={
              money(
                summary.current_wallet_locked
              )
            }
          />

          <SummaryCard
            label="Goal Savings"
            value={
              money(
                summary.current_goal_savings
              )
            }
          />

          <SummaryCard
            label="Current Total Funds"
            value={
              money(
                summary.current_total_funds
              )
            }
          />

          <SummaryCard
            label="Outstanding Loan"
            value={
              money(
                summary.outstanding_loan_balance
              )
            }
          />

          <SummaryCard
            label="Registration Paid"
            value={
              money(
                summary.registration_fee_paid
              )
            }
          />

          <SummaryCard
            label="Registration Remaining"
            value={
              money(
                summary.registration_fee_remaining
              )
            }
          />

          <SummaryCard
            label="Transactions"
            value={
              String(
                statement.transactions
                  .length
              )
            }
          />

        </div>

      )}


      {/* TRANSACTION TABLE */}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">

        <div className="overflow-x-auto">

          <table className="min-w-[1200px] w-full">

            <thead className="bg-slate-50">

              <tr className="text-left text-[11px] font-black uppercase tracking-wide text-slate-500">

                <th className="px-4 py-4">
                  Date
                </th>

                <th className="px-4 py-4">
                  Reference
                </th>

                <th className="px-4 py-4">
                  Description
                </th>

                <th className="px-4 py-4">
                  Status
                </th>

                <th className="px-4 py-4 text-right">
                  Amount
                </th>

                <th className="px-4 py-4 text-right">
                  Fee
                </th>

                <th className="px-4 py-4 text-right">
                  Debit
                </th>

                <th className="px-4 py-4 text-right">
                  Credit
                </th>

                <th className="px-4 py-4 text-right">
                  Balance
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100">

              {loading &&
                !statement && (

                <tr>

                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    <Loader2
                      size={20}
                      className="mx-auto mb-3 animate-spin"
                    />

                    Loading account statement...
                  </td>

                </tr>

              )}


              {!loading &&
                statement &&
                statement.transactions
                  .length ===
                  0 && (

                <tr>

                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No transactions found for this period.
                  </td>

                </tr>

              )}


              {statement?.transactions.map(
                (row) => (

                  <tr
                    key={
                      row.transaction_id
                    }
                    className="text-sm hover:bg-slate-50/70"
                  >

                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                      {formatDate(
                        row.date
                      )}
                    </td>


                    <td className="px-4 py-4">

                      <p className="max-w-[190px] truncate font-mono text-xs font-bold text-slate-700">
                        {row.reference ??
                          "—"}
                      </p>

                    </td>


                    <td className="px-4 py-4">

                      <p className="font-bold text-slate-900">
                        {pretty(
                          row.type
                        )}
                      </p>

                      <p className="mt-1 max-w-[280px] text-xs leading-5 text-slate-500">
                        {row.description ??
                          pretty(
                            row.classification
                          )}
                      </p>

                    </td>


                    <td className="px-4 py-4">

                      <StatusBadge
                        status={
                          row.status
                        }
                      />

                    </td>


                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-700">
                      {money(
                        row.amount
                      )}
                    </td>


                    <td className="whitespace-nowrap px-4 py-4 text-right text-slate-500">
                      {numberValue(
                        row.fee
                      ) >
                      0
                        ? money(
                            row.fee
                          )
                        : "—"}
                    </td>


                    <td className="whitespace-nowrap px-4 py-4 text-right font-black text-red-700">
                      {numberValue(
                        row.debit
                      ) >
                      0
                        ? money(
                            row.debit
                          )
                        : "—"}
                    </td>


                    <td className="whitespace-nowrap px-4 py-4 text-right font-black text-emerald-700">
                      {numberValue(
                        row.credit
                      ) >
                      0
                        ? money(
                            row.credit
                          )
                        : "—"}
                    </td>


                    <td className="whitespace-nowrap px-4 py-4 text-right font-black text-slate-950">
                      {money(
                        row.running_balance
                      )}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </div>


      {statement && (

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Statement balance is calculated from finalized transaction records. Pending, rejected and failed transactions do not change the running balance. Internal Goal transfers affect total funds only when a fee or penalty applies.
        </p>

      )}

    </section>
  );
}


function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-slate-950">
        {value}
      </p>

    </div>
  );
}


function StatusBadge({
  status,
}: {
  status:
    | string
    | null;
}) {

  const value =
    (
      status ??
      "unknown"
    ).toLowerCase();

  const className =
    value ===
      "successful" ||
    value ===
      "paid" ||
    value ===
      "completed"
      ? "bg-emerald-50 text-emerald-700"
      : value ===
          "pending" ||
        value ===
          "processing" ||
        value ===
          "approved"
      ? "bg-amber-50 text-amber-700"
      : value ===
          "rejected" ||
        value ===
          "failed"
      ? "bg-red-50 text-red-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${className}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}
