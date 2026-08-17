"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  HandCoins,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

type Loan = {
  id: string;
  user_id: string;

  member_name:
    | string
    | null;

  account_number:
    | string
    | null;

  member_phone:
    | string
    | null;

  principal:
    | number
    | string
    | null;

  duration_months:
    | number
    | string
    | null;

  monthly_interest_rate:
    | number
    | string
    | null;

  total_interest:
    | number
    | string
    | null;

  total_repayment:
    | number
    | string
    | null;

  required_savings:
    | number
    | string
    | null;

  security_locked:
    | number
    | string
    | null;

  status:
    | string
    | null;

  created_at:
    | string
    | null;

  approved_at:
    | string
    | null;

  disbursed_at?:
    | string
    | null;

  completed_at?:
    | string
    | null;

  admin_created?:
    | boolean
    | null;

  created_by_staff?:
    | string
    | null;

  admin_note?:
    | string
    | null;

  eligibility_overridden?:
    | boolean
    | null;
};

type Props = {
  loans: Loan[];
  staffName: string;
  staffRole: string;
};

type FilterType =
  | "all"
  | "pending"
  | "approved"
  | "active"
  | "completed"
  | "rejected"
  | "cancelled"
  | "defaulted"
  | "admin_created"
  | "member_applied";

type SortField =
  | "created_at"
  | "principal"
  | "total_repayment"
  | "member_name"
  | "duration_months";

const filters: {
  key: FilterType;
  label: string;
}[] = [
  {
    key: "all",
    label: "All",
  },
  {
    key: "pending",
    label: "Pending",
  },
  {
    key: "approved",
    label: "Approved",
  },
  {
    key: "active",
    label: "Active",
  },
  {
    key: "completed",
    label: "Completed",
  },
  {
    key: "rejected",
    label: "Rejected",
  },
  {
    key: "cancelled",
    label: "Cancelled",
  },
  {
    key: "defaulted",
    label: "Defaulted",
  },
  {
    key: "admin_created",
    label: "Admin Created",
  },
  {
    key: "member_applied",
    label: "Member Applied",
  },
];

function numberValue(
  value:
    | number
    | string
    | null
    | undefined
) {
  return Number(
    value ?? 0
  );
}

function money(
  value:
    | number
    | string
    | null
    | undefined
) {
  return `${numberValue(
    value
  ).toLocaleString()} CFA`;
}

function pretty(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "Pending";
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

  return new Date(
    value
  ).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function LoansTable({
  loans,
  staffName,
  staffRole,
}: Props) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      "all"
    );

  const [
    sortField,
    setSortField,
  ] =
    useState<SortField>(
      "created_at"
    );

  const [
    ascending,
    setAscending,
  ] = useState(false);

  const [
    page,
    setPage,
  ] = useState(1);

  const perPage = 20;

  const filteredLoans =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        loans.filter(
          (loan) => {
            const status =
              loan.status
                ?.toLowerCase() ??
              "";

            const matchesSearch =
              !query ||
              loan.member_name
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              loan.account_number
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              loan.member_phone
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              loan.id
                ?.toLowerCase()
                .includes(
                  query
                );

            if (
              !matchesSearch
            ) {
              return false;
            }

            switch (
              filter
            ) {
              case "pending":
              case "approved":
              case "active":
              case "completed":
              case "rejected":
              case "cancelled":
              case "defaulted":
                return (
                  status ===
                  filter
                );

              case "admin_created":
                return (
                  loan.admin_created ===
                  true
                );

              case "member_applied":
                return (
                  loan.admin_created !==
                  true
                );

              case "all":
              default:
                return true;
            }
          }
        );

      result.sort(
        (a, b) => {
          let first:
            | number
            | string =
            0;

          let second:
            | number
            | string =
            0;

          switch (
            sortField
          ) {
            case "principal":
              first =
                numberValue(
                  a.principal
                );

              second =
                numberValue(
                  b.principal
                );
              break;

            case "total_repayment":
              first =
                numberValue(
                  a.total_repayment
                );

              second =
                numberValue(
                  b.total_repayment
                );
              break;

            case "duration_months":
              first =
                numberValue(
                  a.duration_months
                );

              second =
                numberValue(
                  b.duration_months
                );
              break;

            case "member_name":
              first =
                a.member_name
                  ?.toLowerCase() ??
                "";

              second =
                b.member_name
                  ?.toLowerCase() ??
                "";
              break;

            case "created_at":
            default:
              first =
                a.created_at
                  ? new Date(
                      a.created_at
                    ).getTime()
                  : 0;

              second =
                b.created_at
                  ? new Date(
                      b.created_at
                    ).getTime()
                  : 0;
              break;
          }

          if (
            first <
            second
          ) {
            return ascending
              ? -1
              : 1;
          }

          if (
            first >
            second
          ) {
            return ascending
              ? 1
              : -1;
          }

          return 0;
        }
      );

      return result;
    }, [
      loans,
      search,
      filter,
      sortField,
      ascending,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredLoans.length /
          perPage
      )
    );

  const currentPage =
    Math.min(
      page,
      totalPages
    );

  const visibleLoans =
    filteredLoans.slice(
      (currentPage - 1) *
        perPage,
      currentPage *
        perPage
    );

  const pendingCount =
    loans.filter(
      (loan) =>
        loan.status
          ?.toLowerCase() ===
        "pending"
    ).length;

  const activeCount =
    loans.filter(
      (loan) =>
        loan.status
          ?.toLowerCase() ===
        "active"
    ).length;

  const approvedCount =
    loans.filter(
      (loan) =>
        loan.status
          ?.toLowerCase() ===
        "approved"
    ).length;

  const totalOutstanding =
    loans
      .filter((loan) =>
        [
          "approved",
          "active",
        ].includes(
          loan.status
            ?.toLowerCase() ??
            ""
        )
      )
      .reduce(
        (
          total,
          loan
        ) =>
          total +
          numberValue(
            loan.total_repayment
          ),
        0
      );

  function chooseFilter(
    value: FilterType
  ) {
    setFilter(value);
    setPage(1);
  }

  function chooseSort(
    value: SortField
  ) {
    if (
      value ===
      sortField
    ) {
      setAscending(
        (current) =>
          !current
      );
    } else {
      setSortField(
        value
      );

      setAscending(
        false
      );
    }

    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">

          <div>
            <Link
              href="/dashboard"
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              ← Dashboard
            </Link>

            <h1 className="mt-2 text-2xl font-black text-slate-950">
              Loans
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage member loans,
              approvals and
              repayments.
            </p>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-900">
              {staffName}
            </p>

            <p className="text-xs text-slate-500">
              {pretty(
                staffRole
              )}
            </p>
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-5 md:p-8">

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            icon={
              HandCoins
            }
            label="Total Loans"
            value={
              loans.length.toString()
            }
          />

          <SummaryCard
            icon={
              Clock3
            }
            label="Pending"
            value={
              pendingCount.toString()
            }
          />

          <SummaryCard
            icon={
              ShieldCheck
            }
            label="Approved / Active"
            value={(
              approvedCount +
              activeCount
            ).toString()}
          />

          <SummaryCard
            icon={
              CircleDollarSign
            }
            label="Current Loan Value"
            value={money(
              totalOutstanding
            )}
          />

        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 p-5">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div className="relative w-full xl:max-w-md">

                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) => {
                    setSearch(
                      event
                        .target
                        .value
                    );

                    setPage(
                      1
                    );
                  }}
                  placeholder="Search member, account number, phone..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-10 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch(
                        ""
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <X
                      size={
                        17
                      }
                    />
                  </button>
                )}

              </div>

              <div className="flex flex-wrap gap-2">

                {filters.map(
                  (item) => (
                    <button
                      key={
                        item.key
                      }
                      type="button"
                      onClick={() =>
                        chooseFilter(
                          item.key
                        )
                      }
                      className={`rounded-full px-3 py-2 text-xs font-bold ${
                        filter ===
                        item.key
                          ? "bg-blue-700 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {
                        item.label
                      }
                    </button>
                  )
                )}

              </div>

            </div>

            <div className="mt-4 flex flex-wrap gap-2">

              <span className="self-center text-xs font-semibold text-slate-400">
                Sort:
              </span>

              <SortButton
                label="Date"
                active={
                  sortField ===
                  "created_at"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "created_at"
                  )
                }
              />

              <SortButton
                label="Member"
                active={
                  sortField ===
                  "member_name"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "member_name"
                  )
                }
              />

              <SortButton
                label="Principal"
                active={
                  sortField ===
                  "principal"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "principal"
                  )
                }
              />

              <SortButton
                label="Repayment"
                active={
                  sortField ===
                  "total_repayment"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "total_repayment"
                  )
                }
              />

              <SortButton
                label="Duration"
                active={
                  sortField ===
                  "duration_months"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "duration_months"
                  )
                }
              />

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1300px] text-left">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>
                  <th className="px-5 py-4">
                    Member
                  </th>

                  <th className="px-5 py-4">
                    Principal
                  </th>

                  <th className="px-5 py-4">
                    Duration
                  </th>

                  <th className="px-5 py-4">
                    Interest
                  </th>

                  <th className="px-5 py-4">
                    Repayment
                  </th>

                  <th className="px-5 py-4">
                    Required Savings
                  </th>

                  <th className="px-5 py-4">
                    Source
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Created
                  </th>

                  <th className="px-5 py-4">
                    Action
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {visibleLoans.map(
                  (loan) => (
                    <tr
                      key={
                        loan.id
                      }
                      className="hover:bg-slate-50"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <UserRound
                              size={
                                19
                              }
                            />
                          </div>

                          <div>
                            <p className="font-bold text-slate-900">
                              {loan.member_name ??
                                "Member"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {loan.account_number ??
                                "No account number"}
                            </p>
                          </div>

                        </div>

                      </td>

                      <td className="px-5 py-4 font-bold text-slate-900">
                        {money(
                          loan.principal
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {numberValue(
                          loan.duration_months
                        )}{" "}
                        months
                      </td>

                      <td className="px-5 py-4">
                        {money(
                          loan.total_interest
                        )}
                      </td>

                      <td className="px-5 py-4 font-black text-slate-950">
                        {money(
                          loan.total_repayment
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {money(
                          loan.required_savings
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <SourcePill
                          adminCreated={
                            loan.admin_created ===
                            true
                          }
                          overridden={
                            loan.eligibility_overridden ===
                            true
                          }
                        />

                      </td>

                      <td className="px-5 py-4">

                        <LoanStatus
                          status={
                            loan.status
                          }
                        />

                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays
                            size={
                              15
                            }
                          />

                          {formatDate(
                            loan.created_at
                          )}
                        </div>

                      </td>

                      <td className="px-5 py-4">

                        <Link
                          href={`/loans/${loan.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                          View

                          <ChevronRight
                            size={
                              15
                            }
                          />
                        </Link>

                      </td>

                    </tr>
                  )
                )}

                {visibleLoans.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        10
                      }
                      className="px-5 py-14 text-center"
                    >
                      <HandCoins
                        size={
                          30
                        }
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 font-bold text-slate-700">
                        No loans found
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Try changing the search or filter.
                      </p>
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">

            <p className="text-sm text-slate-500">
              {
                filteredLoans.length
              }{" "}
              loan
              {filteredLoans.length ===
              1
                ? ""
                : "s"}
            </p>

            <div className="flex items-center gap-2">

              <button
                type="button"
                disabled={
                  currentPage <=
                  1
                }
                onClick={() =>
                  setPage(
                    currentPage -
                      1
                  )
                }
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
              >
                <ChevronLeft
                  size={
                    18
                  }
                />
              </button>

              <span className="text-sm font-bold text-slate-700">
                {
                  currentPage
                }{" "}
                /{" "}
                {
                  totalPages
                }
              </span>

              <button
                type="button"
                disabled={
                  currentPage >=
                  totalPages
                }
                onClick={() =>
                  setPage(
                    currentPage +
                      1
                  )
                }
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"
              >
                <ChevronRight
                  size={
                    18
                  }
                />
              </button>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;

  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">

      <div className="flex items-center justify-between gap-4">

        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
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

function SortButton({
  label,
  active,
  ascending,
  onClick,
}: {
  label: string;
  active: boolean;
  ascending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 text-slate-600"
      }`}
    >
      {label}

      {active &&
        (ascending ? (
          <ArrowDownAZ
            size={14}
          />
        ) : (
          <ArrowUpAZ
            size={14}
          />
        ))}
    </button>
  );
}

function SourcePill({
  adminCreated,
  overridden,
}: {
  adminCreated: boolean;
  overridden: boolean;
}) {
  if (adminCreated) {
    return (
      <div>
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
          Admin Created
        </span>

        {overridden && (
          <p className="mt-1 text-xs font-semibold text-amber-600">
            Eligibility overridden
          </p>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
      Member Applied
    </span>
  );
}

function LoanStatus({
  status,
}: {
  status:
    | string
    | null;
}) {
  const value =
    status
      ?.toLowerCase() ??
    "pending";

  let style =
    "bg-slate-100 text-slate-600";

  if (
    value ===
    "pending"
  ) {
    style =
      "bg-amber-50 text-amber-700";
  }

  if (
    value ===
    "approved"
  ) {
    style =
      "bg-blue-50 text-blue-700";
  }

  if (
    value ===
    "active"
  ) {
    style =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "completed"
  ) {
    style =
      "bg-teal-50 text-teal-700";
  }

  if (
    value ===
      "rejected" ||
    value ===
      "defaulted"
  ) {
    style =
      "bg-red-50 text-red-700";
  }

  if (
    value ===
    "cancelled"
  ) {
    style =
      "bg-slate-100 text-slate-500";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}
    >
      {pretty(
        value
      )}
    </span>
  );
}