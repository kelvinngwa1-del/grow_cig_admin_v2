"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  BanknoteArrowDown,
  CalendarDays,
  CircleDollarSign,
  Download,
  HandCoins,
  PiggyBank,
  Printer,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================

type CurrentPosition = {
  wallet_available: number;
  wallet_locked: number;
  wallet_total: number;

  goal_savings: number;
  total_savings: number;

  active_loans: number;
  loan_outstanding: number;

  pending_withdrawals: number;
  pending_withdrawal_amount: number;
};

type PeriodSummary = {
  deposits: number;
  withdrawals: number;

  loan_disbursements: number;
  repayments: number;

  new_members: number;

  net_cash_movement: number;
};

type DailyActivity = {
  report_date: string;

  deposits: number;
  withdrawals: number;

  loan_disbursements: number;
  repayments: number;

  net_cash_movement: number;
};

type TransactionRow = {
  id: string;

  member_name: string;
  account_number: string | null;

  reference: string | null;

  type: string;
  destination_type: string | null;

  amount: number;
  status: string;

  description: string | null;

  created_at: string;
};

type ReportData = {
  generated_at: string | null;

  from_date: string;
  to_date: string;

  current: CurrentPosition;

  period: PeriodSummary;

  daily_activity: DailyActivity[];

  transactions: TransactionRow[];
};

// ============================================================
// HELPERS
// ============================================================

function numberValue(
  value: unknown
) {
  const result =
    Number(
      value ?? 0
    );

  return Number.isFinite(
    result
  )
    ? result
    : 0;
}

function money(
  value: unknown
) {
  return `${numberValue(
    value
  ).toLocaleString(
    "en-US",
    {
      maximumFractionDigits:
        0,
    }
  )} CFA`;
}

function pretty(
  value: string
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
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

function formatDate(
  value: string
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
}

function formatDateTime(
  value: string
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
    return "—";
  }

  return date.toLocaleString(
    "en-GB",
    {
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

function dateInput(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
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

function defaultFromDate() {
  const today =
    new Date();

  return dateInput(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );
}

function defaultToDate() {
  return dateInput(
    new Date()
  );
}

function csvValue(
  value: unknown
) {
  const text =
    String(
      value ?? ""
    );

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
}

// ============================================================
// EMPTY DATA
// ============================================================

const emptyReport:
  ReportData = {

    generated_at:
      null,

    from_date:
      "",

    to_date:
      "",

    current: {

      wallet_available:
        0,

      wallet_locked:
        0,

      wallet_total:
        0,

      goal_savings:
        0,

      total_savings:
        0,

      active_loans:
        0,

      loan_outstanding:
        0,

      pending_withdrawals:
        0,

      pending_withdrawal_amount:
        0,

    },

    period: {

      deposits:
        0,

      withdrawals:
        0,

      loan_disbursements:
        0,

      repayments:
        0,

      new_members:
        0,

      net_cash_movement:
        0,

    },

    daily_activity:
      [],

    transactions:
      [],

  };

// ============================================================
// PAGE
// ============================================================

export default function ReportsPage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    fromDate,
    setFromDate,
  ] =
    useState(
      defaultFromDate
    );

  const [
    toDate,
    setToDate,
  ] =
    useState(
      defaultToDate
    );

  const [
    report,
    setReport,
  ] =
    useState<
      ReportData
    >(
      emptyReport
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  // ==========================================================
  // LOAD REPORT
  // ==========================================================

  const loadReport =
    useCallback(
      async () => {
        setLoading(
          true
        );

        setErrorMessage(
          ""
        );

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_admin_financial_report",
            {
              p_from_date:
                fromDate,

              p_to_date:
                toDate,
            }
          );

        if (error) {

          setErrorMessage(
            error.message
          );

          setLoading(
            false
          );

          return;
        }

        const root =
          data &&
          typeof data ===
            "object" &&
          !Array.isArray(
            data
          )
            ? (
                data as Record<
                  string,
                  unknown
                >
              )
            : {};

        const currentRaw =
          root.current &&
          typeof root.current ===
            "object" &&
          !Array.isArray(
            root.current
          )
            ? (
                root.current as Record<
                  string,
                  unknown
                >
              )
            : {};

        const periodRaw =
          root.period &&
          typeof root.period ===
            "object" &&
          !Array.isArray(
            root.period
          )
            ? (
                root.period as Record<
                  string,
                  unknown
                >
              )
            : {};

        const dailyRows =
          Array.isArray(
            root.daily_activity
          )
            ? root.daily_activity
                .filter(
                  (
                    item
                  ) =>
                    item &&
                    typeof item ===
                      "object" &&
                    !Array.isArray(
                      item
                    )
                )
                .map(
                  (
                    item
                  ) => {
                    const row =
                      item as Record<
                        string,
                        unknown
                      >;

                    return {

                      report_date:
                        String(
                          row.report_date ??
                          ""
                        ),

                      deposits:
                        numberValue(
                          row.deposits
                        ),

                      withdrawals:
                        numberValue(
                          row.withdrawals
                        ),

                      loan_disbursements:
                        numberValue(
                          row.loan_disbursements
                        ),

                      repayments:
                        numberValue(
                          row.repayments
                        ),

                      net_cash_movement:
                        numberValue(
                          row.net_cash_movement
                        ),

                    } satisfies DailyActivity;
                  }
                )
            : [];

        const transactionRows =
          Array.isArray(
            root.transactions
          )
            ? root.transactions
                .filter(
                  (
                    item
                  ) =>
                    item &&
                    typeof item ===
                      "object" &&
                    !Array.isArray(
                      item
                    )
                )
                .map(
                  (
                    item
                  ) => {
                    const row =
                      item as Record<
                        string,
                        unknown
                      >;

                    return {

                      id:
                        String(
                          row.id ??
                          ""
                        ),

                      member_name:
                        String(
                          row.member_name ??
                          "Unknown Member"
                        ),

                      account_number:
                        row.account_number
                          ? String(
                              row.account_number
                            )
                          : null,

                      reference:
                        row.reference
                          ? String(
                              row.reference
                            )
                          : null,

                      type:
                        String(
                          row.type ??
                          ""
                        ),

                      destination_type:
                        row.destination_type
                          ? String(
                              row.destination_type
                            )
                          : null,

                      amount:
                        numberValue(
                          row.amount
                        ),

                      status:
                        String(
                          row.status ??
                          ""
                        ),

                      description:
                        row.description
                          ? String(
                              row.description
                            )
                          : null,

                      created_at:
                        String(
                          row.created_at ??
                          ""
                        ),

                    } satisfies TransactionRow;
                  }
                )
            : [];

        setReport({

          generated_at:
            typeof root.generated_at ===
              "string"
              ? root.generated_at
              : null,

          from_date:
            String(
              root.from_date ??
              fromDate
            ),

          to_date:
            String(
              root.to_date ??
              toDate
            ),

          current: {

            wallet_available:
              numberValue(
                currentRaw.wallet_available
              ),

            wallet_locked:
              numberValue(
                currentRaw.wallet_locked
              ),

            wallet_total:
              numberValue(
                currentRaw.wallet_total
              ),

            goal_savings:
              numberValue(
                currentRaw.goal_savings
              ),

            total_savings:
              numberValue(
                currentRaw.total_savings
              ),

            active_loans:
              numberValue(
                currentRaw.active_loans
              ),

            loan_outstanding:
              numberValue(
                currentRaw.loan_outstanding
              ),

            pending_withdrawals:
              numberValue(
                currentRaw.pending_withdrawals
              ),

            pending_withdrawal_amount:
              numberValue(
                currentRaw.pending_withdrawal_amount
              ),

          },

          period: {

            deposits:
              numberValue(
                periodRaw.deposits
              ),

            withdrawals:
              numberValue(
                periodRaw.withdrawals
              ),

            loan_disbursements:
              numberValue(
                periodRaw.loan_disbursements
              ),

            repayments:
              numberValue(
                periodRaw.repayments
              ),

            new_members:
              numberValue(
                periodRaw.new_members
              ),

            net_cash_movement:
              numberValue(
                periodRaw.net_cash_movement
              ),

          },

          daily_activity:
            dailyRows,

          transactions:
            transactionRows,

        });

        setLoading(
          false
        );
      },
      [
        fromDate,
        toDate,
        supabase,
      ]
    );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    void loadReport();
  }, [
    loadReport,
  ]);


  // ==========================================================
  // REFRESH
  // ==========================================================

  async function refresh() {
    if (
      refreshing
    ) {
      return;
    }

    setRefreshing(
      true
    );

    await loadReport();

    setRefreshing(
      false
    );
  }


  // ==========================================================
  // CSV
  // ==========================================================

  function exportCsv() {
    const rows:
      string[][] = [

        [
          "GROW CIG Financial Report",
        ],

        [
          "From",
          report.from_date,
        ],

        [
          "To",
          report.to_date,
        ],

        [],

        [
          "PERIOD SUMMARY",
        ],

        [
          "Deposits",
          String(
            report.period.deposits
          ),
        ],

        [
          "Withdrawals",
          String(
            report.period.withdrawals
          ),
        ],

        [
          "Loan Disbursements",
          String(
            report.period.loan_disbursements
          ),
        ],

        [
          "Loan Repayments",
          String(
            report.period.repayments
          ),
        ],

        [
          "New Members",
          String(
            report.period.new_members
          ),
        ],

        [
          "Net Cash Movement",
          String(
            report.period.net_cash_movement
          ),
        ],

        [],

        [
          "CURRENT POSITION",
        ],

        [
          "Total Member Savings",
          String(
            report.current.total_savings
          ),
        ],

        [
          "Wallet Total",
          String(
            report.current.wallet_total
          ),
        ],

        [
          "Goal Savings",
          String(
            report.current.goal_savings
          ),
        ],

        [
          "Loan Outstanding",
          String(
            report.current.loan_outstanding
          ),
        ],

        [],

        [
          "DAILY ACTIVITY",
        ],

        [
          "Date",
          "Deposits",
          "Withdrawals",
          "Loan Disbursements",
          "Repayments",
          "Net Cash Movement",
        ],

        ...report.daily_activity.map(
          (
            row
          ) => [
            row.report_date,

            String(
              row.deposits
            ),

            String(
              row.withdrawals
            ),

            String(
              row.loan_disbursements
            ),

            String(
              row.repayments
            ),

            String(
              row.net_cash_movement
            ),
          ]
        ),

      ];

    const csv =
      rows
        .map(
          (
            row
          ) =>
            row
              .map(
                csvValue
              )
              .join(
                ","
              )
        )
        .join(
          "\n"
        );

    const blob =
      new Blob(
        [
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      url;

    link.download =
      `GROW-Financial-Report-${report.from_date}-to-${report.to_date}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );
  }


  // ==========================================================
  // PRINT
  // ==========================================================

  function printReport() {
    window.print();
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 print:hidden md:px-8">

        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="mt-1 rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft
                size={
                  19
                }
              />
            </button>

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                GROW CIG ADMIN V2
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950">
                Financial Reports
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Savings, transactions, withdrawals and loan activity.
              </p>

            </div>

          </div>


          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={
                exportCsv
              }
              disabled={
                loading
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >

              <Download
                size={
                  17
                }
              />

              Export CSV

            </button>


            <button
              type="button"
              onClick={
                printReport
              }
              disabled={
                loading
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >

              <Printer
                size={
                  17
                }
              />

              Print

            </button>


            <button
              type="button"
              onClick={
                refresh
              }
              disabled={
                refreshing
              }
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
            >

              <RefreshCw
                size={
                  17
                }
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh

            </button>

          </div>

        </div>

      </header>


      <div className="mx-auto max-w-[1600px] p-5 md:p-8">

        {/* ====================================================
            PRINT TITLE
        ==================================================== */}

        <div className="hidden print:block">

          <h1 className="text-2xl font-black">
            GROW CIG
          </h1>

          <p className="mt-1 font-bold">
            Financial Report
          </p>

          <p className="mt-1 text-sm">
            {formatDate(
              report.from_date
            )}{" "}
            to{" "}
            {formatDate(
              report.to_date
            )}
          </p>

        </div>


        {/* ====================================================
            FILTER
        ==================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 print:hidden">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">

            <div className="flex-1">

              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                From Date
              </label>

              <div className="relative mt-2">

                <CalendarDays
                  size={
                    17
                  }
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
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-500"
                />

              </div>

            </div>


            <div className="flex-1">

              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                To Date
              </label>

              <div className="relative mt-2">

                <CalendarDays
                  size={
                    17
                  }
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
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-500"
                />

              </div>

            </div>


            <button
              type="button"
              onClick={
                loadReport
              }
              disabled={
                loading
              }
              className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Generate Report
            </button>

          </div>

        </section>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {
              errorMessage
            }
          </div>
        )}


        {/* ====================================================
            PERIOD
        ==================================================== */}

        <section className="mt-7">

          <div>

            <h2 className="text-lg font-black text-slate-950">
              Selected Period
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatDate(
                report.from_date ||
                fromDate
              )}{" "}
              —{" "}
              {formatDate(
                report.to_date ||
                toDate
              )}
            </p>

          </div>


          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

            <ReportCard
              title="Deposits"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.deposits
                    )
              }
              subtitle="Member money received"
              icon={
                TrendingUp
              }
            />


            <ReportCard
              title="Paid Withdrawals"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.withdrawals
                    )
              }
              subtitle="Money paid to members"
              icon={
                BanknoteArrowDown
              }
            />


            <ReportCard
              title="Loan Disbursements"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.loan_disbursements
                    )
              }
              subtitle="Loans actually disbursed"
              icon={
                HandCoins
              }
            />


            <ReportCard
              title="Loan Repayments"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.repayments
                    )
              }
              subtitle="Repayments collected"
              icon={
                ReceiptText
              }
            />


            <ReportCard
              title="New Members"
              value={
                loading
                  ? "..."
                  : report.period.new_members.toLocaleString()
              }
              subtitle="Joined during period"
              icon={
                Users
              }
            />


            <ReportCard
              title="Net Cash Movement"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.net_cash_movement
                    )
              }
              subtitle="Cash movement, not profit"
              icon={
                report.period.net_cash_movement >=
                0
                  ? TrendingUp
                  : TrendingDown
              }
              highlight
            />

          </div>

        </section>


        {/* ====================================================
            CURRENT POSITION
        ==================================================== */}

        <section className="mt-8">

          <h2 className="text-lg font-black text-slate-950">
            Current Financial Position
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current balances regardless of selected report period.
          </p>


          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <ReportCard
              title="Total Member Savings"
              value={
                loading
                  ? "..."
                  : money(
                      report.current.total_savings
                    )
              }
              subtitle="Wallet + goals"
              icon={
                CircleDollarSign
              }
            />


            <ReportCard
              title="Wallet Balance"
              value={
                loading
                  ? "..."
                  : money(
                      report.current.wallet_total
                    )
              }
              subtitle={`${money(
                report.current.wallet_locked
              )} locked`}
              icon={
                WalletCards
              }
            />


            <ReportCard
              title="Goal Savings"
              value={
                loading
                  ? "..."
                  : money(
                      report.current.goal_savings
                    )
              }
              subtitle="Current goal balances"
              icon={
                PiggyBank
              }
            />


            <ReportCard
              title="Loan Outstanding"
              value={
                loading
                  ? "..."
                  : money(
                      report.current.loan_outstanding
                    )
              }
              subtitle={`${report.current.active_loans.toLocaleString()} active loans`}
              icon={
                HandCoins
              }
            />

          </div>

        </section>


        {/* ====================================================
            DAILY ACTIVITY
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 p-6">

            <h2 className="text-lg font-black text-slate-950">
              Daily Financial Activity
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Daily cash activity during the selected period.
            </p>

          </div>


          {loading ? (

            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Generating report...
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">

                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4">
                      Deposits
                    </th>

                    <th className="px-5 py-4">
                      Withdrawals
                    </th>

                    <th className="px-5 py-4">
                      Loans Out
                    </th>

                    <th className="px-5 py-4">
                      Repayments
                    </th>

                    <th className="px-5 py-4">
                      Net Movement
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {report.daily_activity.map(
                    (
                      row
                    ) => (

                      <tr
                        key={
                          row.report_date
                        }
                        className="border-t border-slate-100"
                      >

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-900">
                          {formatDate(
                            row.report_date
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-emerald-700">
                          {money(
                            row.deposits
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-red-700">
                          {money(
                            row.withdrawals
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-700">
                          {money(
                            row.loan_disbursements
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-blue-700">
                          {money(
                            row.repayments
                          )}
                        </td>

                        <td
                          className={`whitespace-nowrap px-5 py-4 text-sm font-black ${
                            row.net_cash_movement >=
                            0
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {money(
                            row.net_cash_movement
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


        {/* ====================================================
            TRANSACTIONS
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white print:hidden">

          <div className="border-b border-slate-200 p-6">

            <h2 className="text-lg font-black text-slate-950">
              Transaction Detail
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Up to 200 transactions within this report period.
            </p>

          </div>


          {loading ? (

            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading transactions...
            </div>

          ) : report.transactions.length ===
            0 ? (

            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              No transactions found for this period.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">

                    <th className="px-5 py-4">
                      Member
                    </th>

                    <th className="px-5 py-4">
                      Type
                    </th>

                    <th className="px-5 py-4">
                      Amount
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Reference
                    </th>

                    <th className="px-5 py-4">
                      Date
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {report.transactions.map(
                    (
                      transaction
                    ) => (

                      <tr
                        key={
                          transaction.id
                        }
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >

                        <td className="px-5 py-4">

                          <p className="font-black text-slate-900">
                            {
                              transaction.member_name
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              transaction.account_number ??
                              "—"
                            }
                          </p>

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-700">
                          {pretty(
                            transaction.type
                          )}
                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-900">
                          {money(
                            transaction.amount
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <StatusBadge
                            status={
                              transaction.status
                            }
                          />

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                          {
                            transaction.reference ??
                            "—"
                          }
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


        {/* ====================================================
            ACCOUNTING NOTE
        ==================================================== */}

        <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6">

          <h2 className="font-black text-blue-950">
            Accounting Note
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-700">
            Net Cash Movement is not company profit. Member deposits remain member liabilities and loan disbursements remain loan assets. Profit will be calculated separately from registration income, loan interest, penalties, fees and other recognized income.
          </p>

        </section>

      </div>

    </main>
  );
}


// ============================================================
// REPORT CARD
// ============================================================

function ReportCard({
  title,
  value,
  subtitle,
  icon: Icon,
  highlight = false,
}: {
  title:
    string;

  value:
    string;

  subtitle:
    string;

  icon:
    React.ElementType;

  highlight?:
    boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        highlight
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-sm font-semibold text-slate-500">
            {
              title
            }
          </p>

          <p className="mt-3 break-words text-2xl font-black text-slate-950">
            {
              value
            }
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {
              subtitle
            }
          </p>

        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">

          <Icon
            size={
              21
            }
          />

        </div>

      </div>

    </div>
  );
}


// ============================================================
// STATUS
// ============================================================

function StatusBadge({
  status,
}: {
  status:
    string;
}) {
  const normalized =
    status.toLowerCase();

  let style =
    "bg-slate-100 text-slate-700";

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
    style =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized ===
    "pending"
  ) {
    style =
      "bg-amber-50 text-amber-700";
  }

  if (
    [
      "failed",
      "rejected",
      "cancelled",
    ].includes(
      normalized
    )
  ) {
    style =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${style}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}