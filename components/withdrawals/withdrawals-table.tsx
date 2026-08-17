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
  ArrowDownToLine,
  ArrowUpDown,
  Banknote,
  ChevronRight,
  Clock3,
  Search,
  Smartphone,
  UserRound,
  WalletCards,
} from "lucide-react";

type WithdrawalRow = {
  id: string;
  user_id: string;

  amount:
    | number
    | string;

  fee:
    | number
    | string;

  net_amount:
    | number
    | string;

  phone_number: string;

  mobile_network:
    | string
    | null;

  status: string;

  admin_note:
    | string
    | null;

  created_at: string;

  approved_at:
    | string
    | null;

  processed_at:
    | string
    | null;

  processed_by_staff:
    | string
    | null;

  payout_reference:
    | string
    | null;

  member_name: string;

  account_number:
    | string
    | null;

  member_phone:
    | string
    | null;

  member_email:
    | string
    | null;

  wallet_available_balance:
    | number
    | string;

  wallet_locked_balance:
    | number
    | string;

  staff_name:
    | string
    | null;
};

type Props = {
  withdrawals:
    WithdrawalRow[];

  staffName: string;
  staffRole: string;
};

type SortMode =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest";

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
  if (
    typeof value !==
      "string" ||
    !value
  ) {
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

export default function WithdrawalsTable({
  withdrawals,
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
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "newest"
    );

  const summary =
    useMemo(() => {
      let pending = 0;
      let processing = 0;
      let paid = 0;
      let paidAmount = 0;

      for (
        const withdrawal
        of withdrawals
      ) {
        const status =
          withdrawal.status.toLowerCase();

        if (
          status ===
          "pending"
        ) {
          pending += 1;
        }

        if (
          status ===
            "approved" ||
          status ===
            "processing"
        ) {
          processing += 1;
        }

        if (
          status ===
          "paid"
        ) {
          paid += 1;

          paidAmount +=
            numberValue(
              withdrawal.amount
            );
        }
      }

      return {
        pending,
        processing,
        paid,
        paidAmount,
      };
    }, [
      withdrawals,
    ]);

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        withdrawals.filter(
          (withdrawal) => {
            const status =
              withdrawal.status.toLowerCase();

            if (
              statusFilter !==
                "all" &&
              status !==
                statusFilter
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            const searchable =
              [
                withdrawal.member_name,
                withdrawal.account_number,
                withdrawal.phone_number,
                withdrawal.mobile_network,
                withdrawal.member_phone,
                withdrawal.member_email,
                withdrawal.payout_reference,
                withdrawal.status,
                withdrawal.staff_name,
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
      withdrawals,
      search,
      statusFilter,
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

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Withdrawals
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review and approve Wallet to Mobile Money withdrawal requests.
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
            label="Pending"
            value={`${summary.pending}`}
            icon={Clock3}
          />

          <SummaryCard
            label="Approved / Processing"
            value={`${summary.processing}`}
            icon={
              Smartphone
            }
          />

          <SummaryCard
            label="Paid Withdrawals"
            value={`${summary.paid}`}
            icon={
              ArrowDownToLine
            }
          />

          <SummaryCard
            label="Total Paid"
            value={money(
              summary.paidAmount
            )}
            icon={Banknote}
          />

        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">

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
                placeholder="Search member, account, MoMo number, reference..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
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

              <option value="pending">
                Pending
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="processing">
                Processing
              </option>

              <option value="paid">
                Paid
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>

            <div className="relative">

              <ArrowUpDown
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

          <div className="border-b border-slate-200 px-5 py-4">

            <h2 className="font-black text-slate-950">
              Withdrawal Requests
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Showing{" "}
              {filtered.length}{" "}
              of{" "}
              {withdrawals.length}
            </p>

          </div>

          {filtered.length ===
          0 ? (
            <div className="p-12 text-center">

              <WalletCards
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 font-black text-slate-900">
                No Withdrawals Found
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase text-slate-400">

                    <th className="px-5 py-4">
                      Member
                    </th>

                    <th className="px-5 py-4">
                      Amount
                    </th>

                    <th className="px-5 py-4">
                      MoMo
                    </th>

                    <th className="px-5 py-4">
                      Available
                    </th>

                    <th className="px-5 py-4">
                      Locked
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Requested
                    </th>

                    <th className="px-5 py-4 text-right">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filtered.map(
                    (
                      withdrawal
                    ) => (
                      <tr
                        key={
                          withdrawal.id
                        }
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >

                        <td className="px-5 py-5">

                          <div className="flex min-w-52 items-center gap-3">

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <UserRound
                                size={18}
                              />
                            </div>

                            <div>

                              <Link
                                href={`/members/${withdrawal.user_id}`}
                                className="font-black text-slate-950 hover:text-blue-700"
                              >
                                {withdrawal.member_name}
                              </Link>

                              <p className="mt-1 text-xs font-bold text-blue-700">
                                {withdrawal.account_number ??
                                  "No account number"}
                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="whitespace-nowrap px-5 py-5">

                          <p className="font-black text-slate-950">
                            {money(
                              withdrawal.amount
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Net:{" "}
                            {money(
                              withdrawal.net_amount
                            )}
                          </p>

                        </td>

                        <td className="px-5 py-5">

                          <p className="font-bold text-slate-900">
                            {withdrawal.phone_number}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {withdrawal.mobile_network ??
                              "Mobile Money"}
                          </p>

                        </td>

                        <td className="whitespace-nowrap px-5 py-5 font-bold text-slate-800">
                          {money(
                            withdrawal.wallet_available_balance
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 font-black text-amber-700">
                          {money(
                            withdrawal.wallet_locked_balance
                          )}
                        </td>

                        <td className="px-5 py-5">

                          <StatusBadge
                            status={
                              withdrawal.status
                            }
                          />

                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-500">
                          {formatDateTime(
                            withdrawal.created_at
                          )}
                        </td>

                        <td className="px-5 py-5 text-right">

                          <Link
                            href={`/withdrawals/${withdrawal.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-800"
                          >
                            Review

                            <ChevronRight
                              size={14}
                            />
                          </Link>

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

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const value =
    status.toLowerCase();

  let style =
    "bg-slate-100 text-slate-600";

  if (
    value === "pending"
  ) {
    style =
      "bg-amber-50 text-amber-700";
  } else if (
    value === "approved"
  ) {
    style =
      "bg-blue-50 text-blue-700";
  } else if (
    value === "processing"
  ) {
    style =
      "bg-violet-50 text-violet-700";
  } else if (
    value === "paid"
  ) {
    style =
      "bg-emerald-50 text-emerald-700";
  } else if (
    value ===
      "rejected" ||
    value ===
      "cancelled"
  ) {
    style =
      "bg-red-50 text-red-700";
  }

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