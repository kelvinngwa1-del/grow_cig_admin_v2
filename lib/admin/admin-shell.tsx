"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  Activity,
  BanknoteArrowDown,
  BadgeCheck,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  UserRoundCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================

type Staff = {
  full_name: string;
  email: string;
  role: string;
};

type AdminShellProps = {
  staff: Staff;
};

type NavigationItem = {
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
};

type RecentTransaction = {
  id: string;

  user_id:
    | string
    | null;

  member_name:
    string;

  account_number:
    string | null;

  type:
    string;

  amount:
    number;

  status:
    string;

  reference:
    string | null;

  description:
    string | null;

  destination_type:
    string | null;

  created_at:
    string;
};

type DashboardData = {
  generated_at:
    string | null;

  business_date:
    string | null;

  total_members:
    number | null;

  wallet_available:
    number | null;

  wallet_locked:
    number | null;

  wallet_total:
    number | null;

  goal_savings:
    number | null;

  total_savings:
    number | null;

  today_deposits:
    number | null;

  pending_withdrawals:
    number | null;

  pending_withdrawal_amount:
    number | null;

  today_withdrawals:
    number | null;

  active_loans:
    number | null;

  pending_loans:
    number | null;

  overdue_loans:
    number | null;

  loan_outstanding:
    number | null;

  repayments_collected:
    number | null;

  pending_kyc:
    number | null;

  recent_transactions:
    RecentTransaction[];
};

// ============================================================
// NAVIGATION
// ============================================================

const navigation:
  NavigationItem[] = [

    {
      label:
        "Dashboard",

      href:
        "/dashboard",

      permission:
        "dashboard.view",

      icon:
        LayoutDashboard,
    },

    {
      label:
        "Members",

      href:
        "/members",

      permission:
        "members.view",

      icon:
        Users,
    },

    {
      label:
        "KYC",

      href:
        "/kyc",

      permission:
        "kyc.view",

      icon:
        UserRoundCheck,
    },

    {
      label:
        "Transactions",

      href:
        "/transactions",

      permission:
        "transactions.view",

      icon:
        ReceiptText,
    },

    {
      label:
        "Withdrawals",

      href:
        "/withdrawals",

      permission:
        "withdrawals.view",

      icon:
        BanknoteArrowDown,
    },

    {
      label:
        "Goals",

      href:
        "/goals",

      permission:
        "goals.view",

      icon:
        PiggyBank,
    },

    {
      label:
        "Loans",

      href:
        "/loans",

      permission:
        "loans.view",

      icon:
        HandCoins,
    },

    {
      label:
        "Referrals",

      href:
        "/referrals",

      permission:
        "referrals.view",

      icon:
        Users,
    },

    {
      label:
        "Staff & Roles",

      href:
        "/staff",

      permission:
        "staff.manage",

      icon:
        UserRoundCog,
    },

    {
      label:
        "Loan Settings",

      href:
        "/settings/loan",

      permission:
        "settings.manage",

      icon:
        Settings,
    },

  ];

// ============================================================
// EMPTY DASHBOARD
// ============================================================

const emptyDashboard:
  DashboardData = {

    generated_at:
      null,

    business_date:
      null,

    total_members:
      null,

    wallet_available:
      null,

    wallet_locked:
      null,

    wallet_total:
      null,

    goal_savings:
      null,

    total_savings:
      null,

    today_deposits:
      null,

    pending_withdrawals:
      null,

    pending_withdrawal_amount:
      null,

    today_withdrawals:
      null,

    active_loans:
      null,

    pending_loans:
      null,

    overdue_loans:
      null,

    loan_outstanding:
      null,

    repayments_collected:
      null,

    pending_kyc:
      null,

    recent_transactions:
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
        0,
    }
  )} CFA`;
}

function formatRole(
  value: string
) {
  if (!value) {
    return "Staff";
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

function formatSource(
  value: string
) {
  if (
    value ===
    "direct"
  ) {
    return "Individual Duties";
  }

  if (
    value ===
    "super_admin"
  ) {
    return "Full Access";
  }

  if (
    value ===
    "role"
  ) {
    return "Role Access";
  }

  return "Staff Access";
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
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDateTime(
  value:
    string | null
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

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}

// ============================================================
// MAIN
// ============================================================

export default function AdminShell({
  staff,
}: AdminShellProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [
    sidebarOpen,
    setSidebarOpen,
  ] =
    useState(false);

  const [
    signingOut,
    setSigningOut,
  ] =
    useState(false);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  // ==========================================================
  // ACCESS STATE
  // ==========================================================

  const [
    loadingAccess,
    setLoadingAccess,
  ] =
    useState(true);

  const [
    accessError,
    setAccessError,
  ] =
    useState("");

  const [
    roleName,
    setRoleName,
  ] =
    useState(
      formatRole(
        staff.role
      )
    );

  const [
    permissionSource,
    setPermissionSource,
  ] =
    useState("");

  const [
    permissions,
    setPermissions,
  ] =
    useState<
      Set<string>
    >(
      new Set([
        "dashboard.view",
      ])
    );


  // ==========================================================
  // DASHBOARD STATE
  // ==========================================================

  const [
    dashboard,
    setDashboard,
  ] =
    useState<
      DashboardData
    >(
      emptyDashboard
    );

  const [
    dashboardLoading,
    setDashboardLoading,
  ] =
    useState(true);

  const [
    dashboardError,
    setDashboardError,
  ] =
    useState("");


  // ==========================================================
  // LOAD ACCESS
  // ==========================================================

  const loadAccess =
    useCallback(
      async () => {
        setLoadingAccess(
          true
        );

        setAccessError(
          ""
        );

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_my_admin_access"
          );

        if (error) {

          setAccessError(
            error.message
          );

          if (
            staff.role ===
            "super_admin"
          ) {
            setPermissions(
              new Set(
                navigation.map(
                  (item) =>
                    item.permission
                )
              )
            );
          }

          setLoadingAccess(
            false
          );

          return;
        }

        const payload =
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

        const rawPermissions =
          Array.isArray(
            payload.permissions
          )
            ? payload.permissions
            : [];

        const cleanPermissions =
          rawPermissions.filter(
            (
              value
            ): value is string =>
              typeof value ===
              "string"
          );

        setPermissions(
          new Set(
            cleanPermissions
          )
        );

        if (
          typeof payload.role_name ===
            "string" &&
          payload.role_name.trim()
        ) {
          setRoleName(
            payload.role_name
          );
        }

        if (
          typeof payload.permission_source ===
          "string"
        ) {
          setPermissionSource(
            payload.permission_source
          );
        }

        setLoadingAccess(
          false
        );
      },
      [
        supabase,
        staff.role,
      ]
    );


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard =
    useCallback(
      async () => {
        setDashboardLoading(
          true
        );

        setDashboardError(
          ""
        );

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_admin_dashboard"
          );

        if (error) {

          setDashboardError(
            error.message
          );

          setDashboardLoading(
            false
          );

          return;
        }

        const payload =
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

        const transactions =
          Array.isArray(
            payload.recent_transactions
          )
            ? payload.recent_transactions
                .filter(
                  (
                    row
                  ) =>
                    row &&
                    typeof row ===
                      "object" &&
                    !Array.isArray(
                      row
                    )
                )
                .map(
                  (
                    row
                  ) => {
                    const item =
                      row as Record<
                        string,
                        unknown
                      >;

                    return {

                      id:
                        String(
                          item.id ??
                          ""
                        ),

                      user_id:
                        item.user_id
                          ? String(
                              item.user_id
                            )
                          : null,

                      member_name:
                        String(
                          item.member_name ??
                          "Unknown Member"
                        ),

                      account_number:
                        item.account_number
                          ? String(
                              item.account_number
                            )
                          : null,

                      type:
                        String(
                          item.type ??
                          ""
                        ),

                      amount:
                        numberValue(
                          item.amount
                        ),

                      status:
                        String(
                          item.status ??
                          ""
                        ),

                      reference:
                        item.reference
                          ? String(
                              item.reference
                            )
                          : null,

                      description:
                        item.description
                          ? String(
                              item.description
                            )
                          : null,

                      destination_type:
                        item.destination_type
                          ? String(
                              item.destination_type
                            )
                          : null,

                      created_at:
                        String(
                          item.created_at ??
                          ""
                        ),

                    } satisfies RecentTransaction;
                  }
                )
            : [];

        setDashboard({

          generated_at:
            typeof payload.generated_at ===
            "string"
              ? payload.generated_at
              : null,

          business_date:
            typeof payload.business_date ===
            "string"
              ? payload.business_date
              : null,

          total_members:
            payload.total_members ===
              null ||
            payload.total_members ===
              undefined
              ? null
              : numberValue(
                  payload.total_members
                ),

          wallet_available:
            payload.wallet_available ===
              null ||
            payload.wallet_available ===
              undefined
              ? null
              : numberValue(
                  payload.wallet_available
                ),

          wallet_locked:
            payload.wallet_locked ===
              null ||
            payload.wallet_locked ===
              undefined
              ? null
              : numberValue(
                  payload.wallet_locked
                ),

          wallet_total:
            payload.wallet_total ===
              null ||
            payload.wallet_total ===
              undefined
              ? null
              : numberValue(
                  payload.wallet_total
                ),

          goal_savings:
            payload.goal_savings ===
              null ||
            payload.goal_savings ===
              undefined
              ? null
              : numberValue(
                  payload.goal_savings
                ),

          total_savings:
            payload.total_savings ===
              null ||
            payload.total_savings ===
              undefined
              ? null
              : numberValue(
                  payload.total_savings
                ),

          today_deposits:
            payload.today_deposits ===
              null ||
            payload.today_deposits ===
              undefined
              ? null
              : numberValue(
                  payload.today_deposits
                ),

          pending_withdrawals:
            payload.pending_withdrawals ===
              null ||
            payload.pending_withdrawals ===
              undefined
              ? null
              : numberValue(
                  payload.pending_withdrawals
                ),

          pending_withdrawal_amount:
            payload.pending_withdrawal_amount ===
              null ||
            payload.pending_withdrawal_amount ===
              undefined
              ? null
              : numberValue(
                  payload.pending_withdrawal_amount
                ),

          today_withdrawals:
            payload.today_withdrawals ===
              null ||
            payload.today_withdrawals ===
              undefined
              ? null
              : numberValue(
                  payload.today_withdrawals
                ),

          active_loans:
            payload.active_loans ===
              null ||
            payload.active_loans ===
              undefined
              ? null
              : numberValue(
                  payload.active_loans
                ),

          pending_loans:
            payload.pending_loans ===
              null ||
            payload.pending_loans ===
              undefined
              ? null
              : numberValue(
                  payload.pending_loans
                ),

          overdue_loans:
            payload.overdue_loans ===
              null ||
            payload.overdue_loans ===
              undefined
              ? null
              : numberValue(
                  payload.overdue_loans
                ),

          loan_outstanding:
            payload.loan_outstanding ===
              null ||
            payload.loan_outstanding ===
              undefined
              ? null
              : numberValue(
                  payload.loan_outstanding
                ),

          repayments_collected:
            payload.repayments_collected ===
              null ||
            payload.repayments_collected ===
              undefined
              ? null
              : numberValue(
                  payload.repayments_collected
                ),

          pending_kyc:
            payload.pending_kyc ===
              null ||
            payload.pending_kyc ===
              undefined
              ? null
              : numberValue(
                  payload.pending_kyc
                ),

          recent_transactions:
            transactions,

        });

        setDashboardLoading(
          false
        );
      },
      [
        supabase,
      ]
    );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    void loadAccess();
    void loadDashboard();
  }, [
    loadAccess,
    loadDashboard,
  ]);


  // ==========================================================
  // REFRESH
  // ==========================================================

  async function refreshEverything() {
    if (
      refreshing
    ) {
      return;
    }

    setRefreshing(
      true
    );

    await Promise.all([
      loadAccess(),
      loadDashboard(),
    ]);

    setRefreshing(
      false
    );
  }


  // ==========================================================
  // PERMISSION
  // ==========================================================

  function hasPermission(
    permission: string
  ) {
    return permissions.has(
      permission
    );
  }


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const visibleNavigation =
    useMemo(
      () =>
        navigation.filter(
          (
            item
          ) =>
            item.permission ===
              "dashboard.view" ||
            permissions.has(
              item.permission
            )
        ),
      [
        permissions,
      ]
    );

  const availableModules =
    visibleNavigation.filter(
      (item) =>
        item.href !==
        "/dashboard"
    );


  function openModule(
    href: string
  ) {
    setSidebarOpen(
      false
    );

    router.push(
      href
    );
  }


  function isActive(
    href: string
  ) {
    if (
      href ===
      "/dashboard"
    ) {
      return (
        pathname ===
        "/dashboard"
      );
    }

    return (
      pathname ===
        href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }


  // ==========================================================
  // LOGOUT
  // ==========================================================

  async function logout() {
    if (
      signingOut
    ) {
      return;
    }

    setSigningOut(
      true
    );

    await supabase.auth.signOut();

    router.replace(
      "/"
    );

    router.refresh();
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() =>
            setSidebarOpen(
              false
            )
          }
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}


      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[285px] flex-col bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600">

              <ShieldCheck
                size={
                  24
                }
              />

            </div>

            <div>

              <p className="text-lg font-black">
                GROW CIG
              </p>

              <p className="text-[11px] text-slate-400">
                Admin V2
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(
                false
              )
            }
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
          >

            <X
              size={
                20
              }
            />

          </button>

        </div>


        {/* STAFF */}

        <div className="border-b border-white/10 px-5 py-4">

          <p className="truncate text-sm font-black text-white">
            {
              staff.full_name
            }
          </p>

          <p className="mt-1 truncate text-xs text-slate-400">
            {
              staff.email
            }
          </p>

          <span className="mt-3 inline-flex rounded-full bg-blue-600/20 px-3 py-1 text-[10px] font-black text-blue-300">
            {
              roleName
            }
          </span>

        </div>


        {/* MENU */}

        <nav className="flex-1 overflow-y-auto px-3 py-4">

          <div className="space-y-1">

            {visibleNavigation.map(
              (
                item
              ) => {
                const Icon =
                  item.icon;

                const active =
                  isActive(
                    item.href
                  );

                return (
                  <button
                    key={
                      item.href
                    }
                    type="button"
                    onClick={() =>
                      openModule(
                        item.href
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${
                      active
                        ? "bg-blue-600 font-black text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >

                    <Icon
                      size={
                        19
                      }
                    />

                    <span className="flex-1">
                      {
                        item.label
                      }
                    </span>

                    {active && (
                      <ChevronRight
                        size={
                          16
                        }
                      />
                    )}

                  </button>
                );
              }
            )}

          </div>

        </nav>


        {/* LOGOUT */}

        <div className="border-t border-white/10 p-4">

          <button
            type="button"
            disabled={
              signingOut
            }
            onClick={
              logout
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-slate-300 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          >

            <LogOut
              size={
                18
              }
            />

            {signingOut
              ? "Signing out..."
              : "Logout"}

          </button>

        </div>

      </aside>


      {/* ======================================================
          MAIN AREA
      ====================================================== */}

      <div className="min-h-screen lg:pl-[285px]">

        {/* HEADER */}

        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() =>
                setSidebarOpen(
                  true
                )
              }
              className="rounded-xl border border-slate-200 p-2.5 text-slate-700 lg:hidden"
            >

              <Menu
                size={
                  21
                }
              />

            </button>

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                GROW CIG ADMIN V2
              </p>

              <h1 className="mt-1 text-xl font-black text-slate-950">
                Live Dashboard
              </h1>

            </div>

          </div>


          <div className="flex items-center gap-3">

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={
                refreshEverything
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >

              <RefreshCw
                size={
                  16
                }
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>

            </button>

            <div className="hidden text-right md:block">

              <p className="text-sm font-black text-slate-900">
                {
                  staff.full_name
                }
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {
                  roleName
                }
              </p>

            </div>

          </div>

        </header>


        {/* CONTENT */}

        <main className="p-5 md:p-8">

          {/* ERRORS */}

          {accessError && (
            <MessageBox
              type="warning"
            >
              Unable to refresh permission information:{" "}
              {
                accessError
              }
            </MessageBox>
          )}

          {dashboardError && (
            <MessageBox
              type="error"
            >
              Unable to load live dashboard:{" "}
              {
                dashboardError
              }
            </MessageBox>
          )}


          {/* HERO */}

          <section className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-6 text-white md:p-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  Financial Administration
                </p>

                <h2 className="mt-3 text-2xl font-black md:text-3xl">
                  Welcome back,{" "}
                  {
                    staff.full_name
                      .split(
                        " "
                      )[0]
                  }
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Live member savings, loans, withdrawals and transactions from Supabase.
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">

                <p className="text-xs text-blue-200">
                  Staff Access
                </p>

                <p className="mt-1 font-black">
                  {
                    roleName
                  }
                </p>

                <p className="mt-1 text-xs text-blue-200">
                  {formatSource(
                    permissionSource
                  )}
                </p>

              </div>

            </div>

          </section>


          {/* ==================================================
              LIVE METRICS
          ================================================== */}

          <section className="mt-7">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-lg font-black text-slate-950">
                  Financial Overview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Live values from the database.
                </p>

              </div>

              {dashboardLoading && (
                <span className="text-xs font-bold text-blue-700">
                  Loading...
                </span>
              )}

            </div>


            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {/* MEMBERS */}

              {hasPermission(
                "members.view"
              ) && (
                <MetricCard
                  title="Total Members"
                  value={
                    dashboardLoading
                      ? "..."
                      : numberValue(
                          dashboard.total_members
                        ).toLocaleString()
                  }
                  subtitle="Registered members"
                  icon={
                    Users
                  }
                />
              )}


              {/* SAVINGS */}

              {(hasPermission(
                "members.view"
              ) ||
                hasPermission(
                  "transactions.view"
                )) && (
                <MetricCard
                  title="Total Savings"
                  value={
                    dashboardLoading
                      ? "..."
                      : money(
                          dashboard.total_savings
                        )
                  }
                  subtitle="Wallet + goals"
                  icon={
                    CircleDollarSign
                  }
                />
              )}


              {(hasPermission(
                "members.view"
              ) ||
                hasPermission(
                  "transactions.view"
                )) && (
                <MetricCard
                  title="Wallet Balance"
                  value={
                    dashboardLoading
                      ? "..."
                      : money(
                          dashboard.wallet_total
                        )
                  }
                  subtitle={`${money(
                    dashboard.wallet_locked
                  )} currently locked`}
                  icon={
                    WalletCards
                  }
                />
              )}


              {(hasPermission(
                "members.view"
              ) ||
                hasPermission(
                  "transactions.view"
                )) && (
                <MetricCard
                  title="Goal Savings"
                  value={
                    dashboardLoading
                      ? "..."
                      : money(
                          dashboard.goal_savings
                        )
                  }
                  subtitle="Member savings goals"
                  icon={
                    PiggyBank
                  }
                />
              )}


              {/* TODAY DEPOSITS */}

              {hasPermission(
                "transactions.view"
              ) && (
                <MetricCard
                  title="Today's Deposits"
                  value={
                    dashboardLoading
                      ? "..."
                      : money(
                          dashboard.today_deposits
                        )
                  }
                  subtitle="Successful deposits today"
                  icon={
                    ReceiptText
                  }
                />
              )}


              {/* WITHDRAWALS */}

              {hasPermission(
                "withdrawals.view"
              ) && (
                <MetricCard
                  title="Pending Withdrawals"
                  value={
                    dashboardLoading
                      ? "..."
                      : numberValue(
                          dashboard.pending_withdrawals
                        ).toLocaleString()
                  }
                  subtitle={money(
                    dashboard.pending_withdrawal_amount
                  )}
                  icon={
                    Clock3
                  }
                  urgent={
                    numberValue(
                      dashboard.pending_withdrawals
                    ) >
                    0
                  }
                />
              )}


              {hasPermission(
                "withdrawals.view"
              ) && (
                <MetricCard
                  title="Today's Withdrawals"
                  value={
                    dashboardLoading
                      ? "..."
                      : money(
                          dashboard.today_withdrawals
                        )
                  }
                  subtitle="Paid withdrawals today"
                  icon={
                    BanknoteArrowDown
                  }
                />
              )}


              {/* LOANS */}

              {hasPermission(
                "loans.view"
              ) && (
                <MetricCard
                  title="Active Loans"
                  value={
                    dashboardLoading
                      ? "..."
                      : numberValue(
                          dashboard.active_loans
                        ).toLocaleString()
                  }
                  subtitle={`${numberValue(
                    dashboard.pending_loans
                  ).toLocaleString()} pending`}
                  icon={
                    HandCoins
                  }
                />
              )}


              {hasPermission(
                "loans.view"
              ) && (
                <MetricCard
                  title="Loan Outstanding"
                  value={
                    dashboardLoading
                      ? "..."
                      : money(
                          dashboard.loan_outstanding
                        )
                  }
                  subtitle={`${numberValue(
                    dashboard.overdue_loans
                  ).toLocaleString()} overdue loans`}
                  icon={
                    CircleDollarSign
                  }
                  urgent={
                    numberValue(
                      dashboard.overdue_loans
                    ) >
                    0
                  }
                />
              )}


              {hasPermission(
                "loans.view"
              ) && (
                <MetricCard
                  title="Repayments Collected"
                  value={
                    dashboardLoading
                      ? "..."
                      : money(
                          dashboard.repayments_collected
                        )
                  }
                  subtitle="Total loan repayments"
                  icon={
                    BadgeCheck
                  }
                />
              )}


              {/* KYC */}

              {hasPermission(
                "kyc.view"
              ) && (
                <MetricCard
                  title="Pending KYC"
                  value={
                    dashboardLoading
                      ? "..."
                      : numberValue(
                          dashboard.pending_kyc
                        ).toLocaleString()
                  }
                  subtitle="Awaiting verification"
                  icon={
                    UserRoundCheck
                  }
                  urgent={
                    numberValue(
                      dashboard.pending_kyc
                    ) >
                    0
                  }
                />
              )}

            </div>

          </section>


          {/* ==================================================
              QUICK MODULES
          ================================================== */}

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">

            <h2 className="text-lg font-black text-slate-950">
              Your Assigned Modules
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Only modules assigned to this staff account are available.
            </p>


            {loadingAccess ? (

              <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500">
                Loading staff access...
              </div>

            ) : availableModules.length ===
              0 ? (

              <div className="mt-6 rounded-2xl bg-slate-50 p-6">

                <p className="font-black text-slate-800">
                  No additional modules assigned
                </p>

              </div>

            ) : (

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

                {availableModules.map(
                  (
                    item
                  ) => {
                    const Icon =
                      item.icon;

                    return (
                      <button
                        key={
                          item.href
                        }
                        type="button"
                        onClick={() =>
                          openModule(
                            item.href
                          )
                        }
                        className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white">

                          <Icon
                            size={
                              21
                            }
                          />

                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="font-black text-slate-900">
                            {
                              item.label
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Open module
                          </p>

                        </div>

                        <ChevronRight
                          size={
                            18
                          }
                          className="text-slate-300 group-hover:text-blue-700"
                        />

                      </button>
                    );
                  }
                )}

              </div>

            )}

          </section>


          {/* ==================================================
              RECENT TRANSACTIONS
          ================================================== */}

          {hasPermission(
            "transactions.view"
          ) && (
            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">

              <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h2 className="text-lg font-black text-slate-950">
                    Recent Transactions
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Latest activity across member accounts.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    openModule(
                      "/transactions"
                    )
                  }
                  className="text-sm font-black text-blue-700 hover:text-blue-800"
                >
                  View All
                </button>

              </div>


              {dashboardLoading ? (

                <div className="p-10 text-center text-sm font-semibold text-slate-500">
                  Loading transactions...
                </div>

              ) : dashboard
                  .recent_transactions
                  .length ===
                0 ? (

                <div className="p-10 text-center">

                  <ReceiptText
                    size={
                      34
                    }
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-4 font-black text-slate-900">
                    No Transactions Yet
                  </p>

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
                          Transaction
                        </th>

                        <th className="px-5 py-4">
                          Amount
                        </th>

                        <th className="px-5 py-4">
                          Status
                        </th>

                        <th className="px-5 py-4">
                          Date
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {dashboard
                        .recent_transactions
                        .map(
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
                                    transaction.account_number ||
                                    "No account number"
                                  }
                                </p>

                              </td>

                              <td className="px-5 py-4">

                                <p className="text-sm font-bold text-slate-800">
                                  {pretty(
                                    transaction.type
                                  )}
                                </p>

                                {transaction.reference && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {
                                      transaction.reference
                                    }
                                  </p>
                                )}

                              </td>

                              <td className="whitespace-nowrap px-5 py-4 font-black text-slate-900">

                                {money(
                                  transaction.amount
                                )}

                              </td>

                              <td className="px-5 py-4">

                                <TransactionStatus
                                  status={
                                    transaction.status
                                  }
                                />

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
          )}


          {/* SECURITY */}

          <section className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-6">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white">

                <ShieldCheck
                  size={
                    23
                  }
                />

              </div>

              <div>

                <h2 className="font-black text-blue-950">
                  Permission-Based Financial Dashboard
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-700">
                  Each staff member only receives dashboard data for the modules they are authorized to view.
                </p>

              </div>

            </div>

          </section>

        </main>

      </div>

    </div>
  );
}


// ============================================================
// METRIC CARD
// ============================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  urgent = false,
}: {
  title:
    string;

  value:
    string;

  subtitle:
    string;

  icon:
    LucideIcon;

  urgent?:
    boolean;
}) {
  return (
    <div
      className={`rounded-3xl border bg-white p-5 ${
        urgent
          ? "border-amber-200"
          : "border-slate-200"
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

          <p
            className={`mt-2 text-xs ${
              urgent
                ? "font-bold text-amber-700"
                : "text-slate-400"
            }`}
          >
            {
              subtitle
            }
          </p>

        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            urgent
              ? "bg-amber-50 text-amber-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >

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
// TRANSACTION STATUS
// ============================================================

function TransactionStatus({
  status,
}: {
  status:
    string;
}) {
  const normalized =
    status
      .toLowerCase();

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
      className={`rounded-full px-3 py-1.5 text-xs font-black ${style}`}
    >
      {pretty(
        status
      )}
    </span>
  );
}


// ============================================================
// MESSAGE BOX
// ============================================================

function MessageBox({
  type,
  children,
}: {
  type:
    "warning" |
    "error";

  children:
    React.ReactNode;
}) {
  const style =
    type ===
    "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div
      className={`mb-5 rounded-2xl border p-4 text-sm font-semibold ${style}`}
    >
      {
        children
      }
    </div>
  );
}