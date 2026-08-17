"use client";

import {
  type ReactNode,
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
  BellRing,
  ChevronRight,
  CircleDollarSign,
  FileBarChart,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PiggyBank,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type Staff = {
  full_name: string;
  email: string;
  role: string;
};

type AdminShellProps = {
  staff: Staff;
  children?: ReactNode;
};

type NavigationItem = {
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] =
  [
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
        "Profit",
      href:
        "/profit",
      permission:
        "reports.view",
      icon:
        CircleDollarSign,
    },

    {
      label:
        "Reports",
      href:
        "/reports",
      permission:
        "reports.view",
      icon:
        FileBarChart,
    },

    {
      label:
        "Notifications",
      href:
        "/notifications",
      permission:
        "settings.manage",
      icon:
        BellRing,
    },

    {
      label:
        "Support Tickets",
      href:
        "/support",
      permission:
        "settings.manage",
      icon:
        MessageSquare,
    },

    {
      label:
        "PIN Reset Requests",
      href:
        "/pin-resets",
      permission:
        "settings.manage",
      icon:
        KeyRound,
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
      (
        letter
      ) =>
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
    return "Full Super Admin Access";
  }

  if (
    value ===
    "role"
  ) {
    return "Role Permissions";
  }

  return "Loading";
}

function formatCfa(
  value: number
) {
  return `${new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(value)} CFA`;
}

export default function AdminShell({
  staff,
  children,
}: AdminShellProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const currentPageTitle =
    navigation.find(
      (item) =>
        pathname === item.href ||
        (
          item.href !== "/dashboard" &&
          pathname.startsWith(
            `${item.href}/`
          )
        )
    )?.label ?? "Admin";

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

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

  const [
    totalMemberFunds,
    setTotalMemberFunds,
  ] = useState<number | null>(
    null
  );

  const [
    loadingMemberFunds,
    setLoadingMemberFunds,
  ] = useState(true);

  const [
    memberFundsError,
    setMemberFundsError,
  ] = useState("");

  const [
    supportUnreadCount,
    setSupportUnreadCount,
  ] = useState(0);

  const [
    pinPendingCount,
    setPinPendingCount,
  ] = useState(0);

  // ============================================================
  // LOAD ACTUAL STAFF DUTIES
  // ============================================================

  useEffect(() => {
    let mounted =
      true;

    async function loadAccess() {
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

      if (!mounted) {
        return;
      }

      if (error) {
        setAccessError(
          error.message
        );

        // Safe fallback for Super Admin.
        if (
          staff.role ===
          "super_admin"
        ) {
          setPermissions(
            new Set(
              navigation.map(
                (
                  item
                ) =>
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
    }

    void loadAccess();

    return () => {
      mounted =
        false;
    };
  }, [
    supabase,
    staff.role,
  ]);

  // ============================================================
  // LOAD TOTAL MEMBER FUNDS
  // ============================================================

  useEffect(() => {
    let mounted =
      true;

    async function loadMemberFunds() {
      setLoadingMemberFunds(
        true
      );

      setMemberFundsError(
        ""
      );

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_admin_system_funds"
        );

      if (!mounted) {
        return;
      }

      if (error) {
        setMemberFundsError(
          error.message
        );

        setLoadingMemberFunds(
          false
        );

        return;
      }

      const payload =
        data &&
        typeof data ===
          "object" &&
        !Array.isArray(data)
          ? (
              data as Record<
                string,
                unknown
              >
            )
          : {};

      const parsedTotal =
        Number(
          payload.total_member_funds ??
          0
        );

      setTotalMemberFunds(
        Number.isFinite(
          parsedTotal
        )
          ? parsedTotal
          : 0
      );

      setLoadingMemberFunds(
        false
      );
    }

    void loadMemberFunds();

    return () => {
      mounted =
        false;
    };
  }, [
    supabase,
  ]);

  // ============================================================
  // ADMIN NOTIFICATION BADGES
  // ============================================================

  useEffect(() => {
    if (loadingAccess) {
      return;
    }

    const canViewNotifications =
      staff.role === "super_admin" ||
      permissions.has(
        "settings.manage"
      );

    if (!canViewNotifications) {
      setSupportUnreadCount(0);
      setPinPendingCount(0);
      return;
    }

    let mounted =
      true;

    async function loadNotificationCounts() {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_admin_notification_counts"
        );

      if (
        !mounted ||
        error
      ) {
        return;
      }

      const payload =
        data &&
        typeof data ===
          "object" &&
        !Array.isArray(data)
          ? (
              data as Record<
                string,
                unknown
              >
            )
          : {};

      const supportCount =
        Number(
          payload.support_unread ??
          0
        );

      const pinCount =
        Number(
          payload.pin_pending ??
          0
        );

      setSupportUnreadCount(
        Number.isFinite(
          supportCount
        )
          ? supportCount
          : 0
      );

      setPinPendingCount(
        Number.isFinite(
          pinCount
        )
          ? pinCount
          : 0
      );
    }

    void loadNotificationCounts();

    const channel =
      supabase
        .channel(
          "admin-notification-badges"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "ticket_messages",
          },
          () => {
            void loadNotificationCounts();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "transaction_pin_reset_requests",
          },
          () => {
            void loadNotificationCounts();
          }
        )

        .subscribe();

    return () => {
      mounted =
        false;

      void supabase.removeChannel(
        channel
      );
    };
  }, [
    loadingAccess,
    permissions,
    staff.role,
    supabase,
  ]);

  // ============================================================
  // VISIBLE MODULES
  // ============================================================

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
      (
        item
      ) =>
        item.href !==
        "/dashboard"
    );

  // ============================================================
  // LOGOUT
  // ============================================================

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

  // ============================================================
  // NAVIGATION
  // ============================================================

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

        {/* STAFF INFO */}

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

        {/* NAVIGATION */}

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

                const badgeCount =
                  item.href === "/support"
                    ? supportUnreadCount
                    : item.href === "/pin-resets"
                    ? pinPendingCount
                    : 0;

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

                    {badgeCount > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                        {badgeCount > 99
                          ? "99+"
                          : badgeCount}
                      </span>
                    )}

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
          MAIN
      ====================================================== */}

      <div className="min-h-screen lg:pl-[285px]">

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">

          <div className="flex items-center gap-3">

            <div className="flex items-center gap-2 lg:hidden">

              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = "/dashboard";
                  }
                }}
                aria-label="Go back"
                title="Back"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <span className="text-2xl leading-none">
                  ←
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(
                    true
                  )
                }
                aria-label="Open menu"
                title="Menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <Menu
                  size={
                    21
                  }
                />
              </button>

            </div>

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                GROW CIG ADMIN V2
              </p>

              <h1 className="mt-1 text-xl font-black text-slate-950">
                {currentPageTitle}
              </h1>

            </div>

          </div>

          <div className="hidden text-right sm:block">

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

        </header>

        <main className="p-5 md:p-8">

          {children ?? (
            <>

          {accessError && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              Unable to refresh permission information:{" "}
              {
                accessError
              }
            </div>
          )}

          {memberFundsError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              Unable to load member funds:{" "}
              {
                memberFundsError
              }
            </div>
          )}
          {/* HERO */}

          <section className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-6 text-white md:p-8">

            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
              Administration Overview
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
              Your dashboard now displays only the modules and duties assigned to your staff account.
            </p>

          </section>

          {/* SUMMARY */}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <SummaryCard
              title="Total Member Funds"
              value={
                loadingMemberFunds
                  ? "..."
                  : formatCfa(
                      totalMemberFunds ??
                      0
                    )
              }
              icon={
                PiggyBank
              }
            />
            <SummaryCard
              title="Assigned Modules"
              value={
                loadingAccess
                  ? "..."
                  : String(
                      availableModules.length
                    )
              }
              icon={
                LayoutDashboard
              }
            />

            <SummaryCard
              title="Role"
              value={
                roleName
              }
              icon={
                UserRoundCog
              }
            />

            <SummaryCard
              title="Access Type"
              value={formatSource(
                permissionSource
              )}
              icon={
                ShieldCheck
              }
            />

            <SummaryCard
              title="Security"
              value="Protected"
              icon={
                Activity
              }
            />

          </section>

          {/* ASSIGNED MODULES */}

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">

            <div>

              <h2 className="text-lg font-black text-slate-950">
                Your Assigned Modules
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Only modules authorized for this staff account are displayed.
              </p>

            </div>

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

                <p className="mt-1 text-sm text-slate-500">
                  Ask the Super Admin to assign duties to this account.
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
                  Individual Staff Permissions Active
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-700">
                  Staff access is controlled by the duties assigned to each individual account. Hidden modules cannot be opened directly without the required permission.
                </p>

              </div>

            </div>

          </section>

            </>
          )}

        </main>

      </div>

    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title:
    string;

  value:
    string;

  icon:
    LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-sm font-semibold text-slate-500">
            {
              title
            }
          </p>

          <p className="mt-3 break-words text-xl font-black text-slate-950">
            {
              value
            }
          </p>

        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

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


