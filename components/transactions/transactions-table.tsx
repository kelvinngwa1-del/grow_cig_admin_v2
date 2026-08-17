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
  ArrowDownUp,
  Banknote,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  FileClock,
  ReceiptText,
  Search,
  UserRound,
} from "lucide-react";

type TransactionRow = {
  id: string;
  user_id: string;

  type:
    | string
    | null;

  amount:
    | number
    | string;

  fee:
    | number
    | string
    | null;

  net_amount:
    | number
    | string
    | null;

  status:
    | string
    | null;

  source_type:
    | string
    | null;

  source_id:
    | string
    | null;

  destination_type:
    | string
    | null;

  destination_id:
    | string
    | null;

  reference:
    | string
    | null;

  description:
    | string
    | null;

  created_at: string;

  manual_entry:
    | boolean
    | null;

  created_by_staff:
    | string
    | null;

  manual_reason:
    | string
    | null;

  original_transaction_at:
    | string
    | null;

  member_name:
    | string
    | null;

  account_number:
    | string
    | null;

  member_phone:
    | string
    | null;

  member_email:
    | string
    | null;

  staff_name:
    | string
    | null;
};

type Props = {
  transactions:
    TransactionRow[];

  staffName: string;
  staffRole: string;
};

type OriginFilter =
  | "all"
  | "automatic"
  | "manual";

type SortMode =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest";

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

function money(
  value: unknown
) {
  return `${Math.round(
    numberValue(value)
  ).toLocaleString()} CFA`;
}

function textValue(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : "";
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

function successfulStatus(
  status: unknown
) {
  const value =
    textValue(status)
      .toLowerCase();

  return [
    "successful",
    "success",
    "completed",
    "paid",
    "approved",
  ].includes(value);
}

export default function TransactionsTable({
  transactions,
  staffName,
  staffRole,
}: Props) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("all");

  const [
    originFilter,
    setOriginFilter,
  ] =
    useState<OriginFilter>(
      "all"
    );

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "newest"
    );

  const statuses =
    useMemo(() => {
      return Array.from(
        new Set(
          transactions
            .map(
              (transaction) =>
                textValue(
                  transaction.status
                ).toLowerCase()
            )
            .filter(Boolean)
        )
      ).sort();
    }, [
      transactions,
    ]);

  const types =
    useMemo(() => {
      return Array.from(
        new Set(
          transactions
            .map(
              (transaction) =>
                textValue(
                  transaction.type
                ).toLowerCase()
            )
            .filter(Boolean)
        )
      ).sort();
    }, [
      transactions,
    ]);

  const summary =
    useMemo(() => {
      let successfulAmount =
        0;

      let manualCount = 0;
      let pendingCount = 0;

      for (
        const transaction
        of transactions
      ) {
        if (
          successfulStatus(
            transaction.status
          )
        ) {
          successfulAmount +=
            numberValue(
              transaction.amount
            );
        }

        if (
          transaction.manual_entry
        ) {
          manualCount += 1;
        }

        if (
          textValue(
            transaction.status
          ).toLowerCase() ===
          "pending"
        ) {
          pendingCount += 1;
        }
      }

      return {
        successfulAmount,
        manualCount,
        pendingCount,
      };
    }, [
      transactions,
    ]);

  const filteredTransactions =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        transactions.filter(
          (transaction) => {
            const status =
              textValue(
                transaction.status
              ).toLowerCase();

            const type =
              textValue(
                transaction.type
              ).toLowerCase();

            if (
              statusFilter !==
                "all" &&
              status !==
                statusFilter
            ) {
              return false;
            }

            if (
              typeFilter !==
                "all" &&
              type !==
                typeFilter
            ) {
              return false;
            }

            if (
              originFilter ===
                "manual" &&
              !transaction.manual_entry
            ) {
              return false;
            }

            if (
              originFilter ===
                "automatic" &&
              transaction.manual_entry
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            const searchable =
              [
                transaction.member_name,
                transaction.account_number,
                transaction.member_phone,
                transaction.member_email,
                transaction.reference,
                transaction.type,
                transaction.status,
                transaction.description,
                transaction.destination_type,
                transaction.source_type,
                transaction.staff_name,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );

      return [
        ...result,
      ].sort(
        (a, b) => {
          switch (
            sortMode
          ) {
            case "oldest":
              return (
                new Date(
                  a.created_at
                ).getTime() -
                new Date(
                  b.created_at
                ).getTime()
              );

            case "highest":
              return (
                numberValue(
                  b.amount
                ) -
                numberValue(
                  a.amount
                )
              );

            case "lowest":
              return (
                numberValue(
                  a.amount
                ) -
                numberValue(
                  b.amount
                )
              );

            case "newest":
            default:
              return (
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
              );
          }
        }
      );
    }, [
      transactions,
      search,
      statusFilter,
      typeFilter,
      originFilter,
      sortMode,
    ]);

  return (
    <main className="min-h-screen bg-slate-50">

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              GROW CIG Admin
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Transactions
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review automatic, manual, wallet, Goal and financial transactions.
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

      <div className="mx-auto max-w-[1600px] p-5 md:p-8">

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="All Transactions"
            value={`${transactions.length}`}
            icon={ReceiptText}
          />

          <SummaryCard
            label="Successful Volume"
            value={money(
              summary.successfulAmount
            )}
            icon={Banknote}
          />

          <SummaryCard
            label="Manual / POS"
            value={`${summary.manualCount}`}
            icon={FileClock}
          />

          <SummaryCard
            label="Pending"
            value={`${summary.pendingCount}`}
            icon={Clock3}
          />

        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">

          <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto_auto]">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search member, account, reference, phone..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />

            </div>

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">
                All Statuses
              </option>

              {statuses.map(
                (status) => (
                  <option
                    key={
                      status
                    }
                    value={
                      status
                    }
                  >
                    {pretty(
                      status
                    )}
                  </option>
                )
              )}
            </select>

            <select
              value={
                typeFilter
              }
              onChange={(
                event
              ) =>
                setTypeFilter(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">
                All Types
              </option>

              {types.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {pretty(
                      type
                    )}
                  </option>
                )
              )}
            </select>

            <select
              value={
                originFilter
              }
              onChange={(
                event
              ) =>
                setOriginFilter(
                  event.target
                    .value as OriginFilter
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">
                All Entries
              </option>

              <option value="automatic">
                Automatic
              </option>

              <option value="manual">
                Manual / POS
              </option>
            </select>

            <div className="relative">

              <ArrowDownUp
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={sortMode}
                onChange={(
                  event
                ) =>
                  setSortMode(
                    event.target
                      .value as SortMode
                  )
                }
                className="rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="newest">
                  Newest
                </option>

                <option value="oldest">
                  Oldest
                </option>

                <option value="highest">
                  Highest Amount
                </option>

                <option value="lowest">
                  Lowest Amount
                </option>
              </select>

            </div>

          </div>

        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

            <div>
              <h2 className="font-black text-slate-950">
                Transaction Records
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Showing{" "}
                {
                  filteredTransactions.length
                }{" "}
                of{" "}
                {transactions.length}
              </p>
            </div>

            <ReceiptText className="text-blue-700" />

          </div>

          {filteredTransactions.length ===
          0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">

              <ReceiptText
                size={30}
                className="text-slate-300"
              />

              <p className="mt-4 font-black text-slate-900">
                No Transactions Found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                No transaction matches your current search or filters.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase tracking-wide text-slate-400">

                    <th className="px-5 py-4">
                      Member
                    </th>

                    <th className="px-5 py-4">
                      Transaction
                    </th>

                    <th className="px-5 py-4">
                      Amount
                    </th>

                    <th className="px-5 py-4">
                      Destination
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

                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4 text-right">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredTransactions.map(
                    (
                      transaction
                    ) => (
                      <TransactionRowItem
                        key={
                          transaction.id
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

        </section>

      </div>

    </main>
  );
}

function TransactionRowItem({
  transaction,
}: {
  transaction:
    TransactionRow;
}) {
  return (
    <tr className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70">

      <td className="px-5 py-5">

        <div className="flex min-w-52 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <UserRound
              size={18}
            />
          </div>

          <div>

            <Link
              href={`/members/${transaction.user_id}`}
              className="font-black text-slate-950 hover:text-blue-700"
            >
              {transaction.member_name ??
                "Unknown Member"}
            </Link>

            <p className="mt-1 text-xs font-semibold text-blue-700">
              {transaction.account_number ??
                "No account number"}
            </p>

          </div>

        </div>

      </td>

      <td className="px-5 py-5">

        <div className="min-w-40">

          <Link
            href={`/transactions/${transaction.id}`}
            className="font-black text-slate-900 hover:text-blue-700"
          >
            {pretty(
              transaction.type
            )}
          </Link>

          {transaction.description && (
            <p className="mt-1 max-w-52 truncate text-xs text-slate-500">
              {transaction.description}
            </p>
          )}

        </div>

      </td>

      <td className="whitespace-nowrap px-5 py-5 font-black text-slate-950">
        {money(
          transaction.amount
        )}
      </td>

      <td className="px-5 py-5 text-sm font-semibold text-slate-600">
        {pretty(
          transaction.destination_type
        )}
      </td>

      <td className="px-5 py-5">

        <p className="max-w-44 truncate text-xs font-bold text-blue-700">
          {transaction.reference ??
            "—"}
        </p>

      </td>

      <td className="px-5 py-5">

        {transaction.manual_entry ? (
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
            Manual / POS
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
            Automatic
          </span>
        )}

      </td>

      <td className="px-5 py-5">

        <StatusBadge
          status={
            transaction.status
          }
        />

      </td>

      <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-500">
        {formatDateTime(
          transaction.created_at
        )}
      </td>

      <td className="px-5 py-5 text-right">

        <Link
          href={`/transactions/${transaction.id}`}
          className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-800"
        >
          View

          <ChevronRight
            size={14}
          />
        </Link>

      </td>

    </tr>
  );
}

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

function StatusBadge({
  status,
}: {
  status:
    | string
    | null;
}) {
  const normalized =
    textValue(status)
      .toLowerCase();

  let styles =
    "bg-slate-100 text-slate-600";

  if (
    [
      "successful",
      "success",
      "completed",
      "paid",
      "approved",
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${styles}`}
    >
      {successfulStatus(
        status
      ) && (
        <CircleCheckBig
          size={12}
        />
      )}

      {pretty(
        status
      )}
    </span>
  );
}