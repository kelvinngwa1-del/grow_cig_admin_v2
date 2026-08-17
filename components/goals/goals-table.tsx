"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowUpDown,
  CalendarDays,
  ChevronRight,
  Flag,
  LockKeyhole,
  Search,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type GoalRow = {
  id: string;

  user_id: string;

  name: string;

  target_amount:
    | number
    | string;

  saved_amount:
    | number
    | string;

  locked_amount:
    | number
    | string;

  annual_interest_rate:
    | number
    | string;

  early_withdrawal_penalty_rate:
    | number
    | string;

  target_date:
    | string
    | null;

  status: string;

  created_at: string;
  updated_at: string;

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
};

type Props = {
  goals: GoalRow[];

  staffName: string;
  staffRole: string;
};

type StatusFilter =
  | "all"
  | "active"
  | "completed"
  | "cancelled";

type SortMode =
  | "newest"
  | "oldest"
  | "highest_saved"
  | "highest_target"
  | "progress";

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

function percentage(
  value: number
) {
  if (
    !Number.isFinite(value)
  ) {
    return "0%";
  }

  if (
    Number.isInteger(value)
  ) {
    return `${value}%`;
  }

  return `${value.toFixed(
    1
  )}%`;
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "No target date";
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

function prettyStatus(
  value: string
) {
  if (!value) {
    return "Unknown";
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

function getProgress(
  saved: unknown,
  target: unknown
) {
  const savedAmount =
    numberValue(saved);

  const targetAmount =
    numberValue(target);

  if (
    targetAmount <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (
        savedAmount /
        targetAmount
      ) * 100
    )
  );
}

function getAvailableSavings(
  saved: unknown,
  locked: unknown
) {
  return Math.max(
    numberValue(saved) -
      numberValue(locked),
    0
  );
}

export default function GoalsTable({
  goals,
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
  ] =
    useState<StatusFilter>(
      "all"
    );

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "newest"
    );

  // ============================================================
  // SUMMARY
  // ============================================================

  const summary =
    useMemo(() => {
      let totalTarget = 0;
      let totalSaved = 0;
      let totalLocked = 0;
      let activeCount = 0;

      for (
        const goal
        of goals
      ) {
        totalTarget +=
          numberValue(
            goal.target_amount
          );

        totalSaved +=
          numberValue(
            goal.saved_amount
          );

        totalLocked +=
          numberValue(
            goal.locked_amount
          );

        if (
          goal.status
            ?.toLowerCase() ===
          "active"
        ) {
          activeCount += 1;
        }
      }

      return {
        totalTarget,
        totalSaved,
        totalLocked,
        activeCount,
      };
    }, [
      goals,
    ]);

  // ============================================================
  // FILTER + SORT
  // ============================================================

  const filteredGoals =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        goals.filter(
          (goal) => {
            const status =
              (
                goal.status ??
                ""
              ).toLowerCase();

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

            const searchText =
              [
                goal.name,

                goal.member_name,

                goal.account_number ??
                  "",

                goal.member_phone ??
                  "",

                goal.member_email ??
                  "",

                goal.status ??
                  "",
              ]
                .join(" ")
                .toLowerCase();

            return searchText.includes(
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

            case "highest_saved":
              return (
                numberValue(
                  b.saved_amount
                ) -
                numberValue(
                  a.saved_amount
                )
              );

            case "highest_target":
              return (
                numberValue(
                  b.target_amount
                ) -
                numberValue(
                  a.target_amount
                )
              );

            case "progress":
              return (
                getProgress(
                  b.saved_amount,
                  b.target_amount
                ) -
                getProgress(
                  a.saved_amount,
                  a.target_amount
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
      goals,
      search,
      statusFilter,
      sortMode,
    ]);

  const overallProgress =
    summary.totalTarget > 0
      ? Math.min(
          (
            summary.totalSaved /
            summary.totalTarget
          ) * 100,
          100
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              GROW CIG Admin
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Goals Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Monitor member savings Goals, progress and locked balances.
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

        {/* ====================================================
            SUMMARY CARDS
        ==================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="Total Goals"
            value={`${goals.length}`}
            icon={Flag}
          />

          <SummaryCard
            label="Active Goals"
            value={`${summary.activeCount}`}
            icon={
              TrendingUp
            }
          />

          <SummaryCard
            label="Goal Savings"
            value={money(
              summary.totalSaved
            )}
            icon={
              WalletCards
            }
          />

          <SummaryCard
            label="Locked Savings"
            value={money(
              summary.totalLocked
            )}
            icon={
              LockKeyhole
            }
          />

        </section>

        {/* ====================================================
            TARGET SUMMARY
        ==================================================== */}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 md:p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <p className="text-sm font-semibold text-slate-500">
                Combined Goal Target
              </p>

              <p className="mt-1 text-2xl font-black text-slate-950">
                {money(
                  summary.totalTarget
                )}
              </p>

            </div>

            <div className="w-full max-w-2xl">

              <div className="flex items-center justify-between text-xs font-bold text-slate-500">

                <span>
                  Overall Progress
                </span>

                <span>
                  {percentage(
                    overallProgress
                  )}
                </span>

              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-blue-700 transition-all"
                  style={{
                    width: `${overallProgress}%`,
                  }}
                />

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            FILTERS
        ==================================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">

            <div className="relative">

              <Search
                size={18}
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
                placeholder="Search Goal, member, account number, phone..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
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
                    .value as StatusFilter
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
            >

              <option value="all">
                All Statuses
              </option>

              <option value="active">
                Active
              </option>

              <option value="completed">
                Completed
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
                value={
                  sortMode
                }
                onChange={(
                  event
                ) =>
                  setSortMode(
                    event.target
                      .value as SortMode
                  )
                }
                className="rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-9 text-sm font-semibold text-slate-700 outline-none"
              >

                <option value="newest">
                  Newest
                </option>

                <option value="oldest">
                  Oldest
                </option>

                <option value="highest_saved">
                  Highest Savings
                </option>

                <option value="highest_target">
                  Highest Target
                </option>

                <option value="progress">
                  Highest Progress
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ====================================================
            GOALS TABLE
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

            <div>

              <h2 className="font-black text-slate-950">
                Member Goals
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Showing{" "}
                {
                  filteredGoals.length
                }{" "}
                of{" "}
                {goals.length}
              </p>

            </div>

            <Flag className="text-blue-700" />

          </div>

          {filteredGoals.length ===
          0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

                <Flag
                  size={26}
                />

              </div>

              <p className="mt-4 font-black text-slate-900">
                No Goals Found
              </p>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                No Goal matches your current search or filter.
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
                      Goal
                    </th>

                    <th className="px-5 py-4">
                      Savings
                    </th>

                    <th className="px-5 py-4">
                      Progress
                    </th>

                    <th className="px-5 py-4">
                      Locked
                    </th>

                    <th className="px-5 py-4">
                      Target Date
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredGoals.map(
                    (goal) => (
                      <GoalTableRow
                        key={
                          goal.id
                        }
                        goal={
                          goal
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

// ================================================================
// GOAL ROW
// ================================================================

function GoalTableRow({
  goal,
}: {
  goal: GoalRow;
}) {
  const target =
    numberValue(
      goal.target_amount
    );

  const saved =
    numberValue(
      goal.saved_amount
    );

  const locked =
    numberValue(
      goal.locked_amount
    );

  const available =
    getAvailableSavings(
      saved,
      locked
    );

  const progress =
    getProgress(
      saved,
      target
    );

  return (
    <tr className="border-b border-slate-100 align-top transition last:border-b-0 hover:bg-slate-50/70">

      {/* MEMBER */}

      <td className="px-5 py-5">

        <div className="flex min-w-52 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-700">

            {goal.member_name
              .charAt(0)
              .toUpperCase()}

          </div>

          <div>

            <Link
              href={`/members/${goal.user_id}`}
              className="font-black text-slate-950 hover:text-blue-700"
            >
              {goal.member_name}
            </Link>

            <p className="mt-1 text-xs font-semibold text-blue-700">
              {goal.account_number ??
                "No account number"}
            </p>

          </div>

        </div>

      </td>

      {/* GOAL */}

      <td className="px-5 py-5">

        <div className="min-w-44">

          <Link
            href={`/goals/${goal.id}`}
            className="font-black text-slate-900 transition hover:text-blue-700"
          >
            {goal.name}
          </Link>

          <p className="mt-1 text-xs text-slate-500">
            Target:{" "}
            {money(
              target
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Created{" "}
            {formatDate(
              goal.created_at
            )}
          </p>

        </div>

      </td>

      {/* SAVINGS */}

      <td className="px-5 py-5">

        <div className="min-w-36">

          <p className="font-black text-slate-950">
            {money(
              saved
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Available:{" "}
            {money(
              available
            )}
          </p>

        </div>

      </td>

      {/* PROGRESS */}

      <td className="px-5 py-5">

        <div className="min-w-44">

          <div className="flex items-center justify-between text-xs font-bold">

            <span className="text-slate-500">
              Progress
            </span>

            <span className="text-blue-700">
              {percentage(
                progress
              )}
            </span>

          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">

            <div
              className="h-full rounded-full bg-blue-700"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </div>

      </td>

      {/* LOCKED */}

      <td className="px-5 py-5">

        <div className="min-w-28">

          <p className="font-bold text-slate-900">
            {money(
              locked
            )}
          </p>

          {locked > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700">

              <LockKeyhole
                size={12}
              />

              Secured

            </div>
          )}

        </div>

      </td>

      {/* TARGET DATE */}

      <td className="px-5 py-5">

        <div className="flex min-w-36 items-center gap-2 text-sm text-slate-600">

          <CalendarDays
            size={15}
          />

          {formatDate(
            goal.target_date
          )}

        </div>

      </td>

      {/* STATUS */}

      <td className="px-5 py-5">

        <GoalStatus
          status={
            goal.status
          }
        />

      </td>

      {/* ACTION */}

      <td className="px-5 py-5 text-right">

        <Link
          href={`/goals/${goal.id}`}
          className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-800"
        >
          View Goal

          <ChevronRight
            size={14}
          />
        </Link>

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

  icon: React.ComponentType<{
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

// ================================================================
// GOAL STATUS
// ================================================================

function GoalStatus({
  status,
}: {
  status: string;
}) {
  const normalized =
    (
      status ??
      ""
    ).toLowerCase();

  let styles =
    "bg-slate-100 text-slate-600";

  if (
    normalized ===
    "active"
  ) {
    styles =
      "bg-emerald-50 text-emerald-700";
  } else if (
    normalized ===
    "completed"
  ) {
    styles =
      "bg-blue-50 text-blue-700";
  } else if (
    normalized ===
    "cancelled"
  ) {
    styles =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${styles}`}
    >
      {prettyStatus(
        status
      )}
    </span>
  );
}