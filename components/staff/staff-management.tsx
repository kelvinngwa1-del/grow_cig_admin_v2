"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  LucideIcon,
} from "lucide-react";

import Link from "next/link";

import {
  BadgeCheck,
  CircleOff,
  Loader2,
  Search,
  Settings2,
  Shield,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type StaffRole =
  | "super_admin"
  | "finance_admin"
  | "auditor"
  | "customer_support";

type StaffRow = {
  id: string;

  full_name:
    string;

  email:
    string;

  role:
    StaffRole;

  is_active:
    boolean;

  created_by:
    | string
    | null;

  created_at:
    string;

  updated_at:
    string;

  created_by_name:
    | string
    | null;
};

type GenericRow =
  Record<
    string,
    unknown
  >;

type Props = {
  staff:
    StaffRow[];

  members:
    GenericRow[];

  currentStaffId:
    string;

  currentStaffName:
    string;
};

function formatDate(
  value: string
) {
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

function prettyRole(
  role: string
) {
  return role
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

export default function StaffManagement({
  staff,
  currentStaffId,
  currentStaffName,
}: Props) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    editing,
    setEditing,
  ] =
    useState<
      StaffRow |
      null
    >(
      null
    );

  // ============================================================
  // SUMMARY
  // ============================================================

  const summary =
    useMemo(() => {
      const active =
        staff.filter(
          (item) =>
            item.is_active
        ).length;

      const disabled =
        staff.filter(
          (item) =>
            !item.is_active
        ).length;

      const superAdmins =
        staff.filter(
          (item) =>
            item.is_active &&
            item.role ===
              "super_admin"
        ).length;

      return {
        total:
          staff.length,

        active,

        disabled,

        superAdmins,
      };
    }, [
      staff,
    ]);

  // ============================================================
  // SEARCH
  // ============================================================

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return staff;
      }

      return staff.filter(
        (item) => {
          const searchable =
            [
              item.full_name,
              item.email,
              item.role,
              item.is_active
                ? "active"
                : "disabled",
            ]
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      staff,
      search,
    ]);

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              GROW CIG Admin
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Staff Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage staff accounts, access and custom roles.
            </p>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

              <p className="text-xs text-slate-400">
                Signed in as
              </p>

              <p className="mt-1 text-sm font-black text-slate-900">
                {currentStaffName}
              </p>

            </div>

            <Link
              href="/staff/roles"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800"
            >

              <Settings2
                size={18}
              />

              Roles & Permissions

            </Link>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-[1500px] p-5 md:p-8">

        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

          <div className="flex gap-3">

            <Shield
              size={22}
              className="mt-0.5 shrink-0 text-blue-700"
            />

            <div>

              <p className="font-black text-blue-950">
                Custom Role Management
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                Use Roles & Permissions to create a role, name it yourself, choose exactly what it can control, and assign it to a staff member.
              </p>

            </div>

          </div>

        </section>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="Total Staff"
            value={
              summary.total
            }
            icon={
              Users
            }
          />

          <SummaryCard
            label="Active Staff"
            value={
              summary.active
            }
            icon={
              BadgeCheck
            }
          />

          <SummaryCard
            label="Super Admins"
            value={
              summary.superAdmins
            }
            icon={
              Shield
            }
          />

          <SummaryCard
            label="Disabled"
            value={
              summary.disabled
            }
            icon={
              CircleOff
            }
          />

        </section>

        {/* ====================================================
            SEARCH
        ==================================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">

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
              placeholder="Search staff name, email or role..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />

          </div>

        </section>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="font-black text-slate-950">
                Staff Accounts
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Showing{" "}
                {filtered.length}{" "}
                of{" "}
                {staff.length}
              </p>

            </div>

            <Link
              href="/staff/roles"
              className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-800"
            >

              <UserCog
                size={17}
              />

              Create / Assign Roles

            </Link>

          </div>

          {filtered.length ===
          0 ? (
            <div className="p-12 text-center">

              <Users
                size={34}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 font-black text-slate-900">
                No Staff Found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try another search.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase tracking-wide text-slate-400">

                    <th className="px-5 py-4">
                      Staff
                    </th>

                    <th className="px-5 py-4">
                      Current Role
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Added By
                    </th>

                    <th className="px-5 py-4">
                      Created
                    </th>

                    <th className="px-5 py-4 text-right">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filtered.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >

                        <td className="px-5 py-5">

                          <div className="flex min-w-56 items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                              <UserRound
                                size={19}
                              />

                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <p className="font-black text-slate-950">
                                  {item.full_name}
                                </p>

                                {item.id ===
                                  currentStaffId && (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                                    YOU
                                  </span>
                                )}

                              </div>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {item.email}
                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="px-5 py-5">

                          <RoleBadge
                            role={
                              item.role
                            }
                          />

                        </td>

                        <td className="px-5 py-5">

                          <StatusBadge
                            active={
                              item.is_active
                            }
                          />

                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">

                          {item.created_by_name ??
                            "System"}

                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-500">

                          {formatDate(
                            item.created_at
                          )}

                        </td>

                        <td className="px-5 py-5 text-right">

                          <button
                            type="button"
                            onClick={() =>
                              setEditing(
                                item
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                          >

                            <UserCog
                              size={15}
                            />

                            Manage

                          </button>

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

      {/* ======================================================
          MANAGE STAFF MODAL
      ====================================================== */}

      {editing && (
        <ManageStaffModal
          staff={
            editing
          }
          currentStaffId={
            currentStaffId
          }
          onClose={() =>
            setEditing(
              null
            )
          }
        />
      )}

    </main>
  );
}

// ================================================================
// MANAGE STAFF
// ================================================================

function ManageStaffModal({
  staff,
  currentStaffId,
  onClose,
}: {
  staff:
    StaffRow;

  currentStaffId:
    string;

  onClose:
    () => void;
}) {
  const router =
    useRouter();

  const [
    fullName,
    setFullName,
  ] = useState(
    staff.full_name
  );

  const [
    active,
    setActive,
  ] = useState(
    staff.is_active
  );

  const [
    saving,
    setSaving,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  const isSelf =
    staff.id ===
    currentStaffId;

  async function save(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanName =
      fullName.trim();

    if (
      cleanName.length <
      2
    ) {
      setError(
        "Staff name is required."
      );

      return;
    }

    setSaving(
      true
    );

    try {
      const supabase =
        createClient();

      // Keep current legacy role unchanged.
      // Custom role assignment is managed on /staff/roles.

      const {
        error:
          rpcError,
      } = await supabase.rpc(
        "admin_update_staff",
        {
          p_staff_id:
            staff.id,

          p_full_name:
            cleanName,

          p_role:
            staff.role,

          p_is_active:
            active,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      onClose();

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update staff."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  return (
    <ModalShell
      title="Manage Staff"
      onClose={
        onClose
      }
    >

      <form
        onSubmit={
          save
        }
      >

        <div className="rounded-2xl bg-slate-50 p-4">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

              <UserRound
                size={19}
              />

            </div>

            <div>

              <p className="font-black text-slate-950">
                {staff.full_name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {staff.email}
              </p>

            </div>

          </div>

        </div>

        <FieldLabel
          className="mt-5"
        >
          Staff Name
        </FieldLabel>

        <input
          value={
            fullName
          }
          onChange={(
            event
          ) =>
            setFullName(
              event.target
                .value
            )
          }
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
        />

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="font-black text-slate-900">
                Staff Access
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Disable this account to prevent access to the Admin system.
              </p>

            </div>

            <button
              type="button"
              disabled={
                isSelf
              }
              onClick={() =>
                setActive(
                  !active
                )
              }
              className={
                active
                  ? "rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  : "rounded-full bg-red-100 px-4 py-2 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {active
                ? "Active"
                : "Disabled"}
            </button>

          </div>

          {isSelf && (
            <p className="mt-3 text-xs font-semibold text-amber-700">
              You cannot disable your own Super Admin account.
            </p>
          )}

        </div>

        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">

          <p className="font-black text-blue-900">
            Role & Permissions
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            Roles are now managed separately using the custom Roles & Permissions system.
          </p>

          <Link
            href="/staff/roles"
            onClick={
              onClose
            }
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"
          >

            <Settings2
              size={15}
            />

            Manage Role

          </Link>

        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            saving
          }
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-black text-white transition hover:bg-blue-800 disabled:opacity-50"
        >

          {saving && (
            <Loader2
              size={18}
              className="animate-spin"
            />
          )}

          Save Changes

        </button>

      </form>

    </ModalShell>
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
  label:
    string;

  value:
    number;

  icon:
    LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">

      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between">

        <p className="text-2xl font-black text-slate-950">
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

// ================================================================
// ROLE BADGE
// ================================================================

function RoleBadge({
  role,
}: {
  role:
    StaffRole;
}) {
  let style =
    "bg-slate-100 text-slate-700";

  if (
    role ===
    "super_admin"
  ) {
    style =
      "bg-violet-50 text-violet-700";
  }

  if (
    role ===
    "finance_admin"
  ) {
    style =
      "bg-blue-50 text-blue-700";
  }

  if (
    role ===
    "auditor"
  ) {
    style =
      "bg-amber-50 text-amber-700";
  }

  if (
    role ===
    "customer_support"
  ) {
    style =
      "bg-emerald-50 text-emerald-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-black ${style}`}
    >
      {prettyRole(
        role
      )}
    </span>
  );
}

// ================================================================
// STATUS BADGE
// ================================================================

function StatusBadge({
  active,
}: {
  active:
    boolean;
}) {
  return (
    <span
      className={
        active
          ? "rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"
          : "rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700"
      }
    >
      {active
        ? "Active"
        : "Disabled"}
    </span>
  );
}

// ================================================================
// MODAL
// ================================================================

function ModalShell({
  title,
  children,
  onClose,
}: {
  title:
    string;

  children:
    ReactNode;

  onClose:
    () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

          <h2 className="text-xl font-black text-slate-950">
            {title}
          </h2>

          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X
              size={20}
            />
          </button>

        </div>

        <div className="p-6">
          {children}
        </div>

      </div>

    </div>
  );
}

// ================================================================
// FIELD LABEL
// ================================================================

function FieldLabel({
  children,
  className = "",
}: {
  children:
    ReactNode;

  className?:
    string;
}) {
  return (
    <label
      className={`mb-2 block text-sm font-bold text-slate-700 ${className}`}
    >
      {children}
    </label>
  );
}