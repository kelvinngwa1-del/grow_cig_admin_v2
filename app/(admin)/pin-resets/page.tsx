"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type ResetStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "completed";

type PinResetRequest = {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  expires_at: string | null;
  completed_at: string | null;
};

type MemberProfile = {
  id: string;
  full_name: string | null;
  account_number: string | null;
  phone: string | null;
  email: string | null;
};

type ResetWithMember =
  PinResetRequest & {
    member: MemberProfile | null;
  };

function normalizeStatus(
  value: string | null
): ResetStatus {
  const status =
    value?.toLowerCase().trim();

  if (status === "approved") {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "expired") {
    return "expired";
  }

  if (status === "completed") {
    return "completed";
  }

  return "pending";
}

function statusLabel(
  value: string | null
) {
  const status =
    normalizeStatus(value);

  switch (status) {
    case "approved":
      return "Approved";

    case "rejected":
      return "Rejected";

    case "expired":
      return "Expired";

    case "completed":
      return "Completed";

    default:
      return "Pending";
  }
}

function formatDate(
  value: string | null
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

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

export default function PinResetPage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    requests,
    setRequests,
  ] =
    useState<
      ResetWithMember[]
    >([]);

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
    actionId,
    setActionId,
  ] =
    useState<string | null>(
      null
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<
      "all" | ResetStatus
    >("all");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const loadRequests =
    useCallback(
      async (
        mode:
          | "load"
          | "refresh" =
          "load"
      ) => {
        if (
          mode === "load"
        ) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setErrorMessage("");

        try {
          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            router.replace("/");
            return;
          }

          const {
            data: staff,
            error:
              staffError,
          } =
            await supabase
              .from(
                "staff_users"
              )
              .select(
                "id, role, is_active"
              )
              .eq(
                "id",
                user.id
              )
              .maybeSingle();

          if (
            staffError ||
            !staff ||
            staff.is_active !==
              true
          ) {
            router.replace("/");
            return;
          }

          const {
            data:
              requestRows,
            error:
              requestError,
          } =
            await supabase
              .from(
                "transaction_pin_reset_requests"
              )
              .select(
                "id, user_id, status, requested_at, reviewed_at, reviewed_by, expires_at, completed_at"
              )
              .order(
                "requested_at",
                {
                  ascending:
                    false,
                }
              );

          if (
            requestError
          ) {
            throw requestError;
          }

          const typedRequests =
            (
              requestRows ??
              []
            ) as PinResetRequest[];

          const userIds = [
            ...new Set(
              typedRequests
                .map(
                  (
                    request
                  ) =>
                    request.user_id
                )
                .filter(Boolean)
            ),
          ];

          let memberMap =
            new Map<
              string,
              MemberProfile
            >();

          if (
            userIds.length >
            0
          ) {
            const {
              data:
                profileRows,
              error:
                profileError,
            } =
              await supabase
                .from(
                  "profiles"
                )
                .select(
                  "id, full_name, account_number, phone, email"
                )
                .in(
                  "id",
                  userIds
                );

            if (
              !profileError
            ) {
              memberMap =
                new Map(
                  (
                    (
                      profileRows ??
                      []
                    ) as MemberProfile[]
                  ).map(
                    (
                      profile
                    ) => [
                      profile.id,
                      profile,
                    ]
                  )
                );
            }
          }

          setRequests(
            typedRequests.map(
              (
                request
              ) => ({
                ...request,
                member:
                  memberMap.get(
                    request.user_id
                  ) ??
                  null,
              })
            )
          );
        } catch (
          error
        ) {
          const message =
            error instanceof
            Error
              ? error.message
              : String(
                  error
                );

          setErrorMessage(
            `Unable to load PIN reset requests: ${message}`
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        router,
        supabase,
      ]
    );

  useEffect(() => {
    void loadRequests();

    const channel =
      supabase
        .channel(
          "admin-pin-reset-requests"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "transaction_pin_reset_requests",
          },
          () => {
            void loadRequests(
              "refresh"
            );
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    loadRequests,
    supabase,
  ]);

  const filtered =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return requests.filter(
        (
          request
        ) => {
          const status =
            normalizeStatus(
              request.status
            );

          if (
            filter !==
              "all" &&
            status !==
              filter
          ) {
            return false;
          }

          if (!term) {
            return true;
          }

          const searchable =
            [
              request.member
                ?.full_name ??
                "",
              request.member
                ?.account_number ??
                "",
              request.member
                ?.phone ??
                "",
              request.member
                ?.email ??
                "",
              request.user_id,
              status,
            ];

          return searchable.some(
            (
              value
            ) =>
              value
                .toLowerCase()
                .includes(
                  term
                )
          );
        }
      );
    }, [
      requests,
      search,
      filter,
    ]);

  const stats =
    useMemo(
      () => ({
        total:
          requests.length,

        pending:
          requests.filter(
            (
              request
            ) =>
              normalizeStatus(
                request.status
              ) ===
              "pending"
          ).length,

        approved:
          requests.filter(
            (
              request
            ) =>
              normalizeStatus(
                request.status
              ) ===
              "approved"
          ).length,

        completed:
          requests.filter(
            (
              request
            ) =>
              normalizeStatus(
                request.status
              ) ===
              "completed"
          ).length,
      }),
      [
        requests,
      ]
    );

  async function approveRequest(
    request:
      ResetWithMember
  ) {
    const memberName =
      request.member
        ?.full_name ??
      "this member";

    const confirmed =
      window.confirm(
        `Approve Transaction PIN reset for ${memberName}?\n\nOnly approve after verifying the member's identity. Approval expires after 30 minutes.`
      );

    if (!confirmed) {
      return;
    }

    setActionId(
      request.id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "approve_transaction_pin_reset",
          {
            p_request_id:
              request.id,
          }
        );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        `PIN reset approved for ${memberName}. The member now has 30 minutes to create a new PIN.`
      );

      await loadRequests(
        "refresh"
      );
    } catch (
      error
    ) {
      const message =
        error instanceof
        Error
          ? error.message
          : String(error);

      setErrorMessage(
        `Unable to approve PIN reset: ${message}`
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  async function rejectRequest(
    request:
      ResetWithMember
  ) {
    const memberName =
      request.member
        ?.full_name ??
      "this member";

    const confirmed =
      window.confirm(
        `Reject Transaction PIN reset for ${memberName}?`
      );

    if (!confirmed) {
      return;
    }

    setActionId(
      request.id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "reject_transaction_pin_reset",
          {
            p_request_id:
              request.id,
          }
        );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        `PIN reset request rejected for ${memberName}.`
      );

      await loadRequests(
        "refresh"
      );
    } catch (
      error
    ) {
      const message =
        error instanceof
        Error
          ? error.message
          : String(error);

      setErrorMessage(
        `Unable to reject PIN reset: ${message}`
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-5 py-4 md:px-8">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
              aria-label="Back to dashboard"
            >
              <ArrowLeft
                size={20}
              />
            </button>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                GROW CIG ADMIN V2
              </p>

              <h1 className="mt-1 text-xl font-black text-slate-950">
                PIN Reset Requests
              </h1>
            </div>

          </div>

          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() =>
              void loadRequests(
                "refresh"
              )
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>
      </header>


      <main className="mx-auto max-w-[1600px] space-y-7 p-5 md:p-8">

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}


        <section className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-6 text-white md:p-8">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <KeyRound
                size={26}
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                Account Security
              </p>

              <h2 className="mt-3 text-2xl font-black md:text-3xl">
                Transaction PIN Recovery
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                Verify the member before approving a reset. Staff can never view the member&apos;s old PIN. An approved reset is valid for only 30 minutes.
              </p>
            </div>

          </div>
        </section>


        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Total Requests"
            value={stats.total}
            icon={KeyRound}
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock3}
          />

          <StatCard
            label="Approved"
            value={stats.approved}
            icon={ShieldCheck}
          />

          <StatCard
            label="Completed"
            value={stats.completed}
            icon={CheckCircle2}
          />

        </section>


        <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <h2 className="text-lg font-black text-slate-950">
                Reset Requests
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Confirm the member&apos;s identity and account details before approval.
              </p>
            </div>


            <div className="flex flex-col gap-3 sm:flex-row">

              <div className="relative">

                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    search
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSearch(
                        event.target.value
                      )
                  }
                  placeholder="Search member..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 sm:w-72"
                />

              </div>


              <select
                value={
                  filter
                }
                onChange={
                  (
                    event
                  ) =>
                    setFilter(
                      event.target.value as
                        | "all"
                        | ResetStatus
                    )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
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

                <option value="completed">
                  Completed
                </option>

                <option value="rejected">
                  Rejected
                </option>

                <option value="expired">
                  Expired
                </option>
              </select>

            </div>
          </div>


          {loading ? (

            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              Loading PIN reset requests...
            </div>

          ) : filtered.length ===
            0 ? (

            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">

              <KeyRound
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-black text-slate-800">
                No PIN reset requests found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Member requests will appear here automatically.
              </p>

            </div>

          ) : (

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">

              <div className="overflow-x-auto">

                <table className="min-w-full divide-y divide-slate-200">

                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>
                        Member
                      </TableHead>

                      <TableHead>
                        Contact
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <TableHead>
                        Requested
                      </TableHead>

                      <TableHead>
                        Expires
                      </TableHead>

                      <TableHead>
                        Action
                      </TableHead>
                    </tr>
                  </thead>


                  <tbody className="divide-y divide-slate-100 bg-white">

                    {filtered.map(
                      (
                        request
                      ) => {

                        const status =
                          normalizeStatus(
                            request.status
                          );

                        const busy =
                          actionId ===
                          request.id;

                        return (
                          <tr
                            key={
                              request.id
                            }
                            className="hover:bg-slate-50/70"
                          >

                            <td className="px-4 py-4">

                              <div className="flex items-start gap-3">

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                  <UserRound
                                    size={19}
                                  />
                                </div>

                                <div>
                                  <p className="font-black text-slate-900">
                                    {request.member
                                      ?.full_name ??
                                      "Member"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {request.member
                                      ?.account_number ??
                                      request.user_id}
                                  </p>
                                </div>

                              </div>
                            </td>


                            <td className="px-4 py-4">

                              <p className="text-sm font-semibold text-slate-700">
                                {request.member
                                  ?.phone ??
                                  "No phone"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {request.member
                                  ?.email ??
                                  "No email"}
                              </p>

                            </td>


                            <td className="px-4 py-4">
                              <StatusBadge
                                status={
                                  request.status
                                }
                              />
                            </td>


                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                              {formatDate(
                                request.requested_at
                              )}
                            </td>


                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                              {request.expires_at
                                ? formatDate(
                                    request.expires_at
                                  )
                                : "—"}
                            </td>


                            <td className="px-4 py-4">

                              {busy ? (

                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                                  <Loader2
                                    size={17}
                                    className="animate-spin"
                                  />
                                  Processing...
                                </div>

                              ) : status ===
                                "pending" ? (

                                <div className="flex flex-wrap gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void approveRequest(
                                        request
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                                  >
                                    <CheckCircle2
                                      size={15}
                                    />
                                    Approve
                                  </button>


                                  <button
                                    type="button"
                                    onClick={() =>
                                      void rejectRequest(
                                        request
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                                  >
                                    <XCircle
                                      size={15}
                                    />
                                    Reject
                                  </button>

                                </div>

                              ) : status ===
                                "approved" ? (

                                <button
                                  type="button"
                                  onClick={() =>
                                    void rejectRequest(
                                      request
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                                >
                                  <XCircle
                                    size={15}
                                  />
                                  Cancel Approval
                                </button>

                              ) : (

                                <span className="text-xs font-bold text-slate-400">
                                  No action required
                                </span>

                              )}

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            </div>

          )}

        </section>

      </main>
    </div>
  );
}


function TableHead({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}


function StatusBadge({
  status,
}: {
  status:
    string | null;
}) {
  const normalized =
    normalizeStatus(
      status
    );

  const classes =
    normalized ===
      "completed"
      ? "bg-emerald-50 text-emerald-700"
      : normalized ===
          "approved"
        ? "bg-blue-50 text-blue-700"
        : normalized ===
            "rejected"
          ? "bg-red-50 text-red-700"
          : normalized ===
              "expired"
            ? "bg-slate-100 text-slate-600"
            : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${classes}`}
    >
      {statusLabel(
        status
      )}
    </span>
  );
}


function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label:
    string;

  value:
    number;

  icon:
    React.ComponentType<{
      size?: number;
    }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">

      <div className="flex items-start justify-between gap-4">

        <div>
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-2xl font-black text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon
            size={21}
          />
        </div>

      </div>

    </div>
  );
}
