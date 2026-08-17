"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ElementType,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Download,
  HandCoins,
  PiggyBank,
  Printer,
  RefreshCw,
  TrendingUp,
  UserRoundCheck,
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

type ProfitSummary = {
  registration_income: number;
  loan_interest_income: number;
  early_withdrawal_penalties: number;
  total_profit: number;
};

type DailyRow = {
  date: string;
  registration: number;
  loan_interest: number;
  early_withdrawal_penalties: number;
  total_profit: number;
};

type MonthlyRow = {
  month: string;
  registration: number;
  loan_interest: number;
  early_withdrawal_penalties: number;
  total_profit: number;
};

type ProfitEntry = {
  id: string;

  source: string;

  amount: number;

  user_id:
    | string
    | null;

  member_name: string;

  account_number:
    | string
    | null;

  loan_id:
    | string
    | null;

  transaction_id:
    | string
    | null;

  repayment_id:
    | string
    | null;

  description: string;

  created_at: string;
};

type ProfitReport = {
  generated_at:
    | string
    | null;

  from_date: string;

  to_date: string;

  period:
    ProfitSummary;

  lifetime:
    ProfitSummary;

  daily_activity:
    DailyRow[];

  monthly_activity:
    MonthlyRow[];

  entries:
    ProfitEntry[];
};


// ============================================================
// EMPTY VALUES
// ============================================================

const emptySummary:
  ProfitSummary = {

    registration_income:
      0,

    loan_interest_income:
      0,

    early_withdrawal_penalties:
      0,

    total_profit:
      0,

  };


const emptyReport:
  ProfitReport = {

    generated_at:
      null,

    from_date:
      "",

    to_date:
      "",

    period: {
      ...emptySummary,
    },

    lifetime: {
      ...emptySummary,
    },

    daily_activity:
      [],

    monthly_activity:
      [],

    entries:
      [],

  };


// ============================================================
// HELPERS
// ============================================================

function numberValue(
  value: unknown
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
  value: unknown
) {

  return `${numberValue(
    value
  ).toLocaleString(
    "en-US",
    {
      maximumFractionDigits:
        2,
    }
  )} CFA`;

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

  const now =
    new Date();

  return dateInput(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    )
  );

}


function defaultToDate() {

  return dateInput(
    new Date()
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


function formatMonth(
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
      month:
        "long",

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
    new Date(
      value
    );

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


function sourceName(
  source: string
) {

  switch (
    source
  ) {

    case "registration_fee":
      return "Registration Fee";

    case "loan_interest":
      return "Loan Interest";

    case "early_withdrawal_penalty":
      return "Early Withdrawal Penalty";

    default:
      return source;

  }

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
// PAGE
// ============================================================

export default function ProfitPage() {

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
      ProfitReport
    >(
      emptyReport
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


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
            "get_admin_profit_report",
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
            ? data as Record<
                string,
                unknown
              >
            : {};


        const periodRaw =
          root.period &&
          typeof root.period ===
            "object" &&
          !Array.isArray(
            root.period
          )
            ? root.period as Record<
                string,
                unknown
              >
            : {};


        const lifetimeRaw =
          root.lifetime &&
          typeof root.lifetime ===
            "object" &&
          !Array.isArray(
            root.lifetime
          )
            ? root.lifetime as Record<
                string,
                unknown
              >
            : {};


        const daily =
          Array.isArray(
            root.daily_activity
          )
            ? root.daily_activity.map(
                (
                  item
                ) => {

                  const row =
                    item as Record<
                      string,
                      unknown
                    >;

                  return {

                    date:
                      String(
                        row.date ??
                        ""
                      ),

                    registration:
                      numberValue(
                        row.registration
                      ),

                    loan_interest:
                      numberValue(
                        row.loan_interest
                      ),

                    early_withdrawal_penalties:
                      numberValue(
                        row.early_withdrawal_penalties
                      ),

                    total_profit:
                      numberValue(
                        row.total_profit
                      ),

                  };

                }
              )
            : [];


        const monthly =
          Array.isArray(
            root.monthly_activity
          )
            ? root.monthly_activity.map(
                (
                  item
                ) => {

                  const row =
                    item as Record<
                      string,
                      unknown
                    >;

                  return {

                    month:
                      String(
                        row.month ??
                        ""
                      ),

                    registration:
                      numberValue(
                        row.registration
                      ),

                    loan_interest:
                      numberValue(
                        row.loan_interest
                      ),

                    early_withdrawal_penalties:
                      numberValue(
                        row.early_withdrawal_penalties
                      ),

                    total_profit:
                      numberValue(
                        row.total_profit
                      ),

                  };

                }
              )
            : [];


        const entries =
          Array.isArray(
            root.entries
          )
            ? root.entries.map(
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

                    source:
                      String(
                        row.source ??
                        ""
                      ),

                    amount:
                      numberValue(
                        row.amount
                      ),

                    user_id:
                      row.user_id
                        ? String(
                            row.user_id
                          )
                        : null,

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

                    loan_id:
                      row.loan_id
                        ? String(
                            row.loan_id
                          )
                        : null,

                    transaction_id:
                      row.transaction_id
                        ? String(
                            row.transaction_id
                          )
                        : null,

                    repayment_id:
                      row.repayment_id
                        ? String(
                            row.repayment_id
                          )
                        : null,

                    description:
                      String(
                        row.description ??
                        ""
                      ),

                    created_at:
                      String(
                        row.created_at ??
                        ""
                      ),

                  };

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


          period: {

            registration_income:
              numberValue(
                periodRaw.registration_income
              ),

            loan_interest_income:
              numberValue(
                periodRaw.loan_interest_income
              ),

            early_withdrawal_penalties:
              numberValue(
                periodRaw.early_withdrawal_penalties
              ),

            total_profit:
              numberValue(
                periodRaw.total_profit
              ),

          },


          lifetime: {

            registration_income:
              numberValue(
                lifetimeRaw.registration_income
              ),

            loan_interest_income:
              numberValue(
                lifetimeRaw.loan_interest_income
              ),

            early_withdrawal_penalties:
              numberValue(
                lifetimeRaw.early_withdrawal_penalties
              ),

            total_profit:
              numberValue(
                lifetimeRaw.total_profit
              ),

          },


          daily_activity:
            daily,


          monthly_activity:
            monthly,


          entries:
            entries,

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


  useEffect(
    () => {

      void loadReport();

    },
    [
      loadReport,
    ]
  );


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
  // CSV EXPORT
  // ==========================================================

  function exportCsv() {

    const rows:
      string[][] = [

        [
          "GROW CIG Profit Report",
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
          "PERIOD PROFIT",
        ],

        [
          "Registration Fees",
          String(
            report.period.registration_income
          ),
        ],

        [
          "Loan Interest",
          String(
            report.period.loan_interest_income
          ),
        ],

        [
          "Early Withdrawal Penalties",
          String(
            report.period.early_withdrawal_penalties
          ),
        ],

        [
          "Total Profit",
          String(
            report.period.total_profit
          ),
        ],

        [],

        [
          "LIFETIME PROFIT",
        ],

        [
          "Registration Fees",
          String(
            report.lifetime.registration_income
          ),
        ],

        [
          "Loan Interest",
          String(
            report.lifetime.loan_interest_income
          ),
        ],

        [
          "Early Withdrawal Penalties",
          String(
            report.lifetime.early_withdrawal_penalties
          ),
        ],

        [
          "Total Profit",
          String(
            report.lifetime.total_profit
          ),
        ],

        [],

        [
          "PROFIT LEDGER",
        ],

        [
          "Date",
          "Member",
          "Account",
          "Source",
          "Amount",
          "Description",
        ],

        ...report.entries.map(
          (
            entry
          ) => [

            entry.created_at,

            entry.member_name,

            entry.account_number ??
            "",

            sourceName(
              entry.source
            ),

            String(
              entry.amount
            ),

            entry.description,

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
      `GROW-Profit-${report.from_date}-to-${report.to_date}.csv`;


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
  // PAGE UI
  // ==========================================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

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
              className="mt-1 rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
            >

              <ArrowLeft
                size={
                  19
                }
              />

            </button>


            <div>

              <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-700">
                GROW CIG ADMIN V2
              </p>


              <h1 className="mt-1 text-2xl font-black text-slate-950">
                Profit Accounting
              </h1>


              <p className="mt-1 text-sm text-slate-500">
                Realized income from registration fees, loan interest and early withdrawal penalties.
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
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
              onClick={() =>
                window.print()
              }
              disabled={
                loading
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-50"
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

        {/* DATE FILTER */}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 print:hidden">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">

            <DateField
              label="From Date"
              value={
                fromDate
              }
              onChange={
                setFromDate
              }
            />


            <DateField
              label="To Date"
              value={
                toDate
              }
              onChange={
                setToDate
              }
            />


            <button
              type="button"
              disabled={
                loading
              }
              onClick={() =>
                void loadReport()
              }
              className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              Generate Report
            </button>

          </div>

        </section>


        {/* ERROR */}

        {errorMessage && (

          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {
              errorMessage
            }
          </div>

        )}


        {/* SELECTED PERIOD */}

        <section className="mt-8">

          <h2 className="text-lg font-black text-slate-950">
            Selected Period
          </h2>


          <p className="mt-1 text-sm text-slate-500">

            {formatDate(
              report.from_date ||
              fromDate
            )}

            {" — "}

            {formatDate(
              report.to_date ||
              toDate
            )}

          </p>


          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <ProfitCard
              title="Registration Income"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.registration_income
                    )
              }
              subtitle="Registration fees received"
              icon={
                UserRoundCheck
              }
            />


            <ProfitCard
              title="Loan Interest"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.loan_interest_income
                    )
              }
              subtitle="Contractual interest collected"
              icon={
                HandCoins
              }
            />


            <ProfitCard
              title="Withdrawal Penalties"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.early_withdrawal_penalties
                    )
              }
              subtitle="Early goal withdrawals"
              icon={
                PiggyBank
              }
            />


            <ProfitCard
              title="Total Profit"
              value={
                loading
                  ? "..."
                  : money(
                      report.period.total_profit
                    )
              }
              subtitle="Total realized profit"
              icon={
                TrendingUp
              }
              featured
            />

          </div>

        </section>


        {/* LIFETIME PROFIT */}

        <section className="mt-8 rounded-3xl bg-slate-950 p-6 text-white md:p-8">

          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            Lifetime
          </p>


          <h2 className="mt-2 text-xl font-black">
            Total Realized Profit
          </h2>


          <p className="mt-4 text-4xl font-black">
            {
              loading
                ? "..."
                : money(
                    report.lifetime.total_profit
                  )
            }
          </p>


          <div className="mt-6 grid gap-4 md:grid-cols-3">

            <LifetimeCard
              label="Registration"
              value={
                report.lifetime.registration_income
              }
            />


            <LifetimeCard
              label="Loan Interest"
              value={
                report.lifetime.loan_interest_income
              }
            />


            <LifetimeCard
              label="Withdrawal Penalties"
              value={
                report.lifetime.early_withdrawal_penalties
              }
            />

          </div>

        </section>


        {/* MONTHLY PROFIT */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 p-6">

            <h2 className="text-lg font-black text-slate-950">
              Monthly Profit
            </h2>


            <p className="mt-1 text-sm text-slate-500">
              Profit breakdown by month.
            </p>

          </div>


          {loading ? (

            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading monthly profit...
            </div>

          ) : report.monthly_activity.length ===
            0 ? (

            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              No monthly profit records for this period.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">

                    <th className="px-5 py-4">
                      Month
                    </th>

                    <th className="px-5 py-4">
                      Registration
                    </th>

                    <th className="px-5 py-4">
                      Loan Interest
                    </th>

                    <th className="px-5 py-4">
                      Penalties
                    </th>

                    <th className="px-5 py-4">
                      Total
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {report.monthly_activity.map(
                    (
                      row
                    ) => (

                      <tr
                        key={
                          row.month
                        }
                        className="border-t border-slate-100"
                      >

                        <td className="whitespace-nowrap px-5 py-4 font-black text-slate-900">

                          {formatMonth(
                            row.month
                          )}

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">

                          {money(
                            row.registration
                          )}

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">

                          {money(
                            row.loan_interest
                          )}

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">

                          {money(
                            row.early_withdrawal_penalties
                          )}

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 font-black text-blue-700">

                          {money(
                            row.total_profit
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


        {/* PROFIT LEDGER */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 p-6">

            <h2 className="text-lg font-black text-slate-950">
              Profit Ledger
            </h2>


            <p className="mt-1 text-sm text-slate-500">
              Detailed recognized income records.
            </p>

          </div>


          {loading ? (

            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading profit records...
            </div>

          ) : report.entries.length ===
            0 ? (

            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              No profit recorded during this period.
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
                      Source
                    </th>

                    <th className="px-5 py-4">
                      Amount
                    </th>

                    <th className="px-5 py-4">
                      Description
                    </th>

                    <th className="px-5 py-4">
                      Date
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {report.entries.map(
                    (
                      entry
                    ) => (

                      <tr
                        key={
                          entry.id
                        }
                        className="border-t border-slate-100"
                      >

                        <td className="px-5 py-4">

                          <p className="font-black text-slate-900">
                            {
                              entry.member_name
                            }
                          </p>


                          <p className="mt-1 text-xs text-slate-500">
                            {
                              entry.account_number ??
                              "—"
                            }
                          </p>

                        </td>


                        <td className="px-5 py-4">

                          <SourceBadge
                            source={
                              entry.source
                            }
                          />

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 font-black text-emerald-700">

                          {money(
                            entry.amount
                          )}

                        </td>


                        <td className="min-w-[260px] px-5 py-4 text-sm text-slate-600">

                          {
                            entry.description
                          }

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">

                          {formatDateTime(
                            entry.created_at
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


        {/* ACCOUNTING RULE */}

        <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6">

          <div className="flex gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white">

              <CircleDollarSign
                size={
                  23
                }
              />

            </div>


            <div>

              <h2 className="font-black text-blue-950">
                GROW Profit Rule
              </h2>


              <p className="mt-2 text-sm leading-6 text-blue-700">
                Total Profit = Registration Fees + Collected Loan Interest + Early Withdrawal Penalties.
                Member deposits, wallet savings, goal savings and loan principal are not counted as profit.
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );

}


// ============================================================
// DATE FIELD
// ============================================================

function DateField({
  label,
  value,
  onChange,
}: {
  label:
    string;

  value:
    string;

  onChange:
    (
      value: string
    ) => void;
}) {

  return (
    <div className="flex-1">

      <label className="text-xs font-black uppercase tracking-wide text-slate-500">
        {
          label
        }
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
            value
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-blue-500"
        />

      </div>

    </div>
  );

}


// ============================================================
// PROFIT CARD
// ============================================================

function ProfitCard({
  title,
  value,
  subtitle,
  icon: Icon,
  featured = false,
}: {
  title:
    string;

  value:
    string;

  subtitle:
    string;

  icon:
    ElementType;

  featured?:
    boolean;
}) {

  return (
    <div
      className={`rounded-3xl border p-5 ${
        featured
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm font-semibold text-slate-500">
            {
              title
            }
          </p>


          <p className="mt-3 text-2xl font-black text-slate-950">
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
// LIFETIME CARD
// ============================================================

function LifetimeCard({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">

      <p className="text-xs text-slate-300">
        {
          label
        }
      </p>


      <p className="mt-2 text-lg font-black">
        {money(
          value
        )}
      </p>

    </div>
  );

}


// ============================================================
// SOURCE BADGE
// ============================================================

function SourceBadge({
  source,
}: {
  source:
    string;
}) {

  let style =
    "bg-slate-100 text-slate-700";


  if (
    source ===
    "registration_fee"
  ) {

    style =
      "bg-blue-50 text-blue-700";

  }


  if (
    source ===
    "loan_interest"
  ) {

    style =
      "bg-emerald-50 text-emerald-700";

  }


  if (
    source ===
    "early_withdrawal_penalty"
  ) {

    style =
      "bg-amber-50 text-amber-700";

  }


  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-black ${style}`}
    >

      {sourceName(
        source
      )}

    </span>
  );

}