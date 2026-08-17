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
  BadgeCheck,
  Clock3,
  Gift,
  Search,
  Trophy,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

type ReferralRow = {
  id: string;

  referrer_id: string;
  referred_user_id: string;

  qualifying_deposit_amount:
    | number
    | string;

  reward_amount:
    | number
    | string;

  status: string;

  qualified_at:
    | string
    | null;

  rewarded_at:
    | string
    | null;

  created_at: string;

  referrer_name: string;

  referrer_account_number:
    | string
    | null;

  referrer_phone:
    | string
    | null;

  referred_name: string;

  referred_account_number:
    | string
    | null;

  referred_phone:
    | string
    | null;
};

type Props = {
  referrals:
    ReferralRow[];

  staffName: string;
  staffRole: string;
};

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
    .replaceAll("_", " ")
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

export default function ReferralsTable({
  referrals,
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

  // ============================================================
  // UNIQUE STATUSES
  // ============================================================

  const statuses =
    useMemo(() => {
      return Array.from(
        new Set(
          referrals
            .map(
              (referral) =>
                referral.status
                  ?.toLowerCase()
            )
            .filter(Boolean)
        )
      ).sort();
    }, [
      referrals,
    ]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const summary =
    useMemo(() => {
      let pending = 0;
      let qualified = 0;
      let rewarded = 0;
      let totalRewards = 0;

      for (
        const referral
        of referrals
      ) {
        const status =
          referral.status
            ?.toLowerCase() ??
          "";

        if (
          status ===
          "pending"
        ) {
          pending += 1;
        }

        if (
          referral.qualified_at
        ) {
          qualified += 1;
        }

        if (
          referral.rewarded_at
        ) {
          rewarded += 1;

          totalRewards +=
            numberValue(
              referral.reward_amount
            );
        }
      }

      return {
        pending,
        qualified,
        rewarded,
        totalRewards,
      };
    }, [
      referrals,
    ]);

  // ============================================================
  // TOP REFERRER
  // ============================================================

  const topReferrer =
    useMemo(() => {
      const counts =
        new Map<
          string,
          {
            id: string;
            name: string;
            account: string;
            count: number;
            rewarded: number;
          }
        >();

      for (
        const referral
        of referrals
      ) {
        const existing =
          counts.get(
            referral.referrer_id
          );

        if (existing) {
          existing.count += 1;

          if (
            referral.rewarded_at
          ) {
            existing.rewarded +=
              numberValue(
                referral.reward_amount
              );
          }

          continue;
        }

        counts.set(
          referral.referrer_id,
          {
            id:
              referral.referrer_id,

            name:
              referral.referrer_name,

            account:
              referral.referrer_account_number ??
              "—",

            count: 1,

            rewarded:
              referral.rewarded_at
                ? numberValue(
                    referral.reward_amount
                  )
                : 0,
          }
        );
      }

      return (
        Array.from(
          counts.values()
        ).sort(
          (a, b) =>
            b.count -
            a.count
        )[0] ??
        null
      );
    }, [
      referrals,
    ]);

  // ============================================================
  // FILTER
  // ============================================================

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return referrals.filter(
        (referral) => {
          const status =
            referral.status
              ?.toLowerCase() ??
            "";

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
              referral.referrer_name,
              referral.referrer_account_number,
              referral.referrer_phone,

              referral.referred_name,
              referral.referred_account_number,
              referral.referred_phone,

              referral.status,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      referrals,
      search,
      statusFilter,
    ]);

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              GROW CIG Admin
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Referrals
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Monitor referrals, qualifying deposits and rewards.
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

        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="Total Referrals"
            value={`${referrals.length}`}
            icon={Users}
          />

          <SummaryCard
            label="Pending"
            value={`${summary.pending}`}
            icon={Clock3}
          />

          <SummaryCard
            label="Qualified"
            value={`${summary.qualified}`}
            icon={
              BadgeCheck
            }
          />

          <SummaryCard
            label="Rewards Paid"
            value={money(
              summary.totalRewards
            )}
            icon={Gift}
          />

        </section>

        {/* TOP REFERRER */}

        {topReferrer && (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">

                  <Trophy
                    size={24}
                  />

                </div>

                <div>

                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Top Referrer
                  </p>

                  <Link
                    href={`/members/${topReferrer.id}`}
                    className="mt-1 block text-xl font-black text-slate-950 hover:text-blue-700"
                  >
                    {topReferrer.name}
                  </Link>

                  <p className="mt-1 text-xs font-bold text-blue-700">
                    {topReferrer.account}
                  </p>

                </div>

              </div>

              <div className="sm:text-right">

                <p className="text-3xl font-black text-slate-950">
                  {topReferrer.count}
                </p>

                <p className="text-xs font-semibold text-slate-500">
                  Referral
                  {topReferrer.count ===
                  1
                    ? ""
                    : "s"}
                </p>

              </div>

            </div>

          </section>
        )}

        {/* FILTER */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">

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
                placeholder="Search referrer, referred member, account or phone..."
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

              {statuses.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {pretty(
                      status
                    )}
                  </option>
                )
              )}

            </select>

          </div>

        </section>

        {/* TABLE */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 px-5 py-4">

            <h2 className="font-black text-slate-950">
              Referral Records
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Showing{" "}
              {filtered.length}{" "}
              of{" "}
              {referrals.length}
            </p>

          </div>

          {filtered.length ===
          0 ? (
            <div className="p-12 text-center">

              <UserPlus
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 font-black text-slate-900">
                No Referrals Found
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase text-slate-400">

                    <th className="px-5 py-4">
                      Referrer
                    </th>

                    <th className="px-5 py-4">
                      Referred Member
                    </th>

                    <th className="px-5 py-4">
                      Qualifying Deposit
                    </th>

                    <th className="px-5 py-4">
                      Reward
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Created
                    </th>

                    <th className="px-5 py-4">
                      Qualified
                    </th>

                    <th className="px-5 py-4">
                      Rewarded
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filtered.map(
                    (
                      referral
                    ) => (
                      <tr
                        key={
                          referral.id
                        }
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >

                        <td className="px-5 py-5">

                          <MemberCell
                            userId={
                              referral.referrer_id
                            }
                            name={
                              referral.referrer_name
                            }
                            account={
                              referral.referrer_account_number
                            }
                            phone={
                              referral.referrer_phone
                            }
                          />

                        </td>

                        <td className="px-5 py-5">

                          <MemberCell
                            userId={
                              referral.referred_user_id
                            }
                            name={
                              referral.referred_name
                            }
                            account={
                              referral.referred_account_number
                            }
                            phone={
                              referral.referred_phone
                            }
                          />

                        </td>

                        <td className="whitespace-nowrap px-5 py-5 font-black text-slate-900">
                          {money(
                            referral.qualifying_deposit_amount
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 font-black text-blue-700">
                          {money(
                            referral.reward_amount
                          )}
                        </td>

                        <td className="px-5 py-5">

                          <StatusBadge
                            status={
                              referral.status
                            }
                          />

                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-500">
                          {formatDateTime(
                            referral.created_at
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-500">
                          {formatDateTime(
                            referral.qualified_at
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-500">
                          {formatDateTime(
                            referral.rewarded_at
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

function MemberCell({
  userId,
  name,
  account,
  phone,
}: {
  userId: string;
  name: string;

  account:
    | string
    | null;

  phone:
    | string
    | null;
}) {
  return (
    <div className="flex min-w-52 items-center gap-3">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

        <UserRound
          size={18}
        />

      </div>

      <div>

        <Link
          href={`/members/${userId}`}
          className="font-black text-slate-950 hover:text-blue-700"
        >
          {name}
        </Link>

        <p className="mt-1 text-xs font-bold text-blue-700">
          {account ??
            "No account number"}
        </p>

        {phone && (
          <p className="mt-1 text-xs text-slate-400">
            {phone}
          </p>
        )}

      </div>

    </div>
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

      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between">

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

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status
      ?.toLowerCase() ??
    "";

  let style =
    "bg-slate-100 text-slate-600";

  if (
    normalized ===
    "pending"
  ) {
    style =
      "bg-amber-50 text-amber-700";
  } else if (
    normalized ===
      "qualified" ||
    normalized ===
      "successful"
  ) {
    style =
      "bg-blue-50 text-blue-700";
  } else if (
    normalized ===
      "rewarded" ||
    normalized ===
      "paid"
  ) {
    style =
      "bg-emerald-50 text-emerald-700";
  } else if (
    normalized ===
      "rejected" ||
    normalized ===
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