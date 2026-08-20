"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  BadgeCheck,
  Check,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Row =
  Record<
    string,
    unknown
  >;

type Permission = {
  permission_key:
    string;

  module:
    string;

  label:
    string;

  description:
    string;

  sort_order:
    number;
};

type Staff = {
  id:
    string;

  full_name:
    string;

  email:
    string;

  legacy_role:
    string;

  custom_role_name:
    string;

  display_role_name:
    string;

  is_active:
    boolean;

  permissions:
    string[];

  permission_source:
    string;
};

type Member = {
  id:
    string;

  full_name:
    string;

  account_number:
    string;

  email:
    string;

  phone:
    string;
};

type Props = {
  permissions:
    Row[];

  staff:
    Row[];

  members:
    Row[];

  currentUserId:
    string;
};

function textValue(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : "";
}

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

function boolValue(
  value: unknown
) {
  return value === true;
}

function stringArray(
  value: unknown
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item ===
        "string"
  );
}

function normalizePermission(
  row: Row
): Permission {
  return {

    permission_key:
      textValue(
        row.permission_key
      ),

    module:
      textValue(
        row.module
      ) ||
      "Other",

    label:
      textValue(
        row.label
      ),

    description:
      textValue(
        row.description
      ),

    sort_order:
      numberValue(
        row.sort_order
      ),

  };
}

function normalizeStaff(
  row: Row
): Staff {
  return {

    id:
      textValue(
        row.id
      ),

    full_name:
      textValue(
        row.full_name
      ) ||
      "Staff Member",

    email:
      textValue(
        row.email
      ),

    legacy_role:
      textValue(
        row.legacy_role
      ),

    custom_role_name:
      textValue(
        row.custom_role_name
      ),

    display_role_name:
      textValue(
        row.display_role_name
      ),

    is_active:
      boolValue(
        row.is_active
      ),

    permissions:
      stringArray(
        row.permissions
      ),

    permission_source:
      textValue(
        row.permission_source
      ),

  };
}

function normalizeMember(
  row: Row
): Member {
  return {

    id:
      textValue(
        row.user_id
      ) ||
      textValue(
        row.id
      ),

    full_name:
      textValue(
        row.full_name
      ) ||
      "Unknown Member",

    account_number:
      textValue(
        row.account_number
      ),

    email:
      textValue(
        row.email
      ),

    phone:
      textValue(
        row.phone
      ) ||
      textValue(
        row.contact_number
      ),

  };
}

export default function StaffAccessManager({
  permissions,
  staff,
  members,
  currentUserId,
}: Props) {
  const router =
    useRouter();

  // ============================================================
  // NORMALIZED DATA
  // ============================================================

  const permissionList =
    useMemo(
      () =>
        permissions
          .map(
            normalizePermission
          )
          .filter(
            (item) =>
              !!item.permission_key
          )
          .sort(
            (a, b) =>
              a.sort_order -
              b.sort_order
          ),
      [
        permissions,
      ]
    );

  const staffList =
    useMemo(
      () =>
        staff
          .map(
            normalizeStaff
          )
          .filter(
            (item) =>
              !!item.id
          ),
      [
        staff,
      ]
    );

  const memberList =
    useMemo(
      () =>
        members
          .map(
            normalizeMember
          )
          .filter(
            (item) =>
              !!item.id
          ),
      [
        members,
      ]
    );

  const staffById =
    useMemo(() => {
      return new Map(
        staffList.map(
          (item) => [
            item.id,
            item,
          ]
        )
      );
    }, [
      staffList,
    ]);

  const membersById =
    useMemo(() => {
      return new Map(
        memberList.map(
          (item) => [
            item.id,
            item,
          ]
        )
      );
    }, [
      memberList,
    ]);

  // ============================================================
  // STATES
  // ============================================================

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState("");

  const [
    roleName,
    setRoleName,
  ] = useState("");

  const [
    selectedPermissions,
    setSelectedPermissions,
  ] = useState<
    Set<string>
  >(
    new Set([
      "dashboard.view",
    ])
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  // ============================================================
  // ============================================================
  // TEMPORARY MEMBERSHIP DATE ACCESS
  // ============================================================

  const [
    backdateHours,
    setBackdateHours,
  ] = useState("4");

  const [
    backdateReason,
    setBackdateReason,
  ] = useState("");

  const [
    backdateSaving,
    setBackdateSaving,
  ] = useState(false);

  // GROUP DUTIES
  // ============================================================

  const groupedPermissions =
    useMemo(() => {
      const map =
        new Map<
          string,
          Permission[]
        >();

      for (
        const permission
        of permissionList
      ) {
        const current =
          map.get(
            permission.module
          ) ?? [];

        current.push(
          permission
        );

        map.set(
          permission.module,
          current
        );
      }

      return Array.from(
        map.entries()
      );
    }, [
      permissionList,
    ]);

  // ============================================================
  // MEMBER SEARCH
  // ============================================================

  const filteredMembers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return memberList
        .filter(
          (member) =>
            member.id !==
            currentUserId
        )
        .filter(
          (member) => {
            if (!query) {
              return true;
            }

            return [
              member.full_name,
              member.account_number,
              member.email,
              member.phone,
              staffById.get(
                member.id
              )
                ?.display_role_name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(
                query
              );
          }
        );
    }, [
      memberList,
      search,
      staffById,
      currentUserId,
    ]);

  // ============================================================
  // SELECT PERSON
  // ============================================================

  function selectPerson(
    userId: string
  ) {
    setError("");
    setSuccess("");

    setSelectedUserId(
      userId
    );

    const existingStaff =
      staffById.get(
        userId
      );

    if (
      existingStaff
    ) {
      setRoleName(
        existingStaff
          .custom_role_name ||
        existingStaff
          .display_role_name ||
        ""
      );

      const currentPermissions =
        existingStaff
          .permissions
          .length >
        0
          ? existingStaff
              .permissions
          : [
              "dashboard.view",
            ];

      setSelectedPermissions(
        new Set(
          [
            ...currentPermissions,
            "dashboard.view",
          ]
        )
      );

      return;
    }

    setRoleName("");

    setSelectedPermissions(
      new Set([
        "dashboard.view",
      ])
    );
  }

  // ============================================================
  // TOGGLE DUTY
  // ============================================================

  function togglePermission(
    permissionKey: string
  ) {
    if (
      permissionKey ===
      "dashboard.view"
    ) {
      return;
    }

    setSelectedPermissions(
      (
        previous
      ) => {
        const next =
          new Set(
            previous
          );

        if (
          next.has(
            permissionKey
          )
        ) {
          next.delete(
            permissionKey
          );
        } else {
          next.add(
            permissionKey
          );
        }

        next.add(
          "dashboard.view"
        );

        return next;
      }
    );
  }

  // ============================================================
  // MODULE SELECT ALL
  // ============================================================

  function toggleModule(
    modulePermissions:
      Permission[]
  ) {
    setSelectedPermissions(
      (
        previous
      ) => {
        const next =
          new Set(
            previous
          );

        const optionalKeys =
          modulePermissions
            .map(
              (item) =>
                item.permission_key
            )
            .filter(
              (key) =>
                key !==
                "dashboard.view"
            );

        const allSelected =
          optionalKeys.every(
            (key) =>
              next.has(
                key
              )
          );

        for (
          const key of
          optionalKeys
        ) {
          if (
            allSelected
          ) {
            next.delete(
              key
            );
          } else {
            next.add(
              key
            );
          }
        }

        next.add(
          "dashboard.view"
        );

        return next;
      }
    );
  }

  // ============================================================
  // SAVE ACCESS
  // ============================================================

  async function saveAccess() {
    setError("");
    setSuccess("");

    if (
      !selectedUserId
    ) {
      setError(
        "Select a staff member first."
      );

      return;
    }

    const cleanRoleName =
      roleName.trim();

    if (
      cleanRoleName.length <
      2
    ) {
      setError(
        "Enter the staff member's role name."
      );

      return;
    }

    setSaving(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        error:
          rpcError,
      } = await supabase.rpc(
        "admin_configure_staff_access",
        {

          p_user_id:
            selectedUserId,

          p_role_name:
            cleanRoleName,

          p_permissions:
            Array.from(
              selectedPermissions
            ),

        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setSuccess(
        "Staff role and duties saved successfully."
      );

      router.refresh();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save staff access."
      );

    } finally {

      setSaving(
        false
      );

    }
  }

  // ============================================================
  // ============================================================
  // TEMPORARY MEMBERSHIP DATE ACCESS ACTIONS
  // ============================================================

  async function grantBackdateAccess() {

    setError("");
    setSuccess("");

    if (!selectedUserId) {
      setError(
        "Select a staff member first."
      );
      return;
    }

    const hours =
      Number(
        backdateHours
      );

    if (
      Number.isNaN(hours) ||
      hours <= 0
    ) {
      setError(
        "Select a valid access period."
      );
      return;
    }

    const cleanReason =
      backdateReason.trim();

    if (
      cleanReason.length < 3
    ) {
      setError(
        "Enter a short reason for granting temporary access."
      );
      return;
    }

    setBackdateSaving(true);

    try {

      const expiresAt =
        new Date(
          Date.now() +
            hours *
              60 *
              60 *
              1000
        ).toISOString();

      const supabase =
        createClient();

      const {
        error: rpcError,
      } = await supabase.rpc(
        "admin_grant_member_backdate_access",
        {
          p_staff_id:
            selectedUserId,

          p_expires_at:
            expiresAt,

          p_reason:
            cleanReason,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setSuccess(
        `Temporary membership-date access granted for ${hours} hour${
          hours === 1
            ? ""
            : "s"
        }.`
      );

      setBackdateReason("");

      router.refresh();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to grant temporary membership-date access."
      );

    } finally {

      setBackdateSaving(false);

    }
  }


  async function revokeBackdateAccess() {

    setError("");
    setSuccess("");

    if (!selectedUserId) {
      setError(
        "Select a staff member first."
      );
      return;
    }

    setBackdateSaving(true);

    try {

      const supabase =
        createClient();

      const {
        error: rpcError,
      } = await supabase.rpc(
        "admin_revoke_member_backdate_access",
        {
          p_staff_id:
            selectedUserId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setSuccess(
        "Temporary membership-date access revoked."
      );

      router.refresh();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to revoke temporary membership-date access."
      );

    } finally {

      setBackdateSaving(false);

    }
  }

  // SELECTED PERSON
  // ============================================================

  const selectedMember =
    selectedUserId
      ? membersById.get(
          selectedUserId
        )
      : null;

  const selectedStaff =
    selectedUserId
      ? staffById.get(
          selectedUserId
        )
      : null;

  const currentStaff =
    currentUserId
      ? staffById.get(
          currentUserId
        )
      : null;

  const isSuperAdmin =
    currentStaff?.legacy_role ===
    "super_admin";

  // ============================================================
  // UI
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto max-w-[1600px]">

          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            GROW CIG Admin
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Staff Duties & Access
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Select a staff member, give them any role name you want, then choose exactly what they are allowed to control.
          </p>

        </div>

      </header>

      <div className="mx-auto max-w-[1600px] p-5 md:p-8">

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">

          {/* ==================================================
              LEFT SIDE - CHOOSE PERSON
          ================================================== */}

          <aside className="rounded-3xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 p-5">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">

                  <Users
                    size={20}
                  />

                </div>

                <div>

                  <h2 className="font-black text-slate-950">
                    Choose Staff
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Select an existing member.
                  </p>

                </div>

              </div>

              <div className="relative mt-4">

                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
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
                  placeholder="Name, account, phone..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-600"
                />

              </div>

            </div>

            <div className="max-h-[650px] overflow-y-auto">

              {filteredMembers
                .slice(
                  0,
                  100
                )
                .map(
                  (
                    member
                  ) => {
                    const staffRecord =
                      staffById.get(
                        member.id
                      );

                    const selected =
                      member.id ===
                      selectedUserId;

                    return (
                      <button
                        key={
                          member.id
                        }
                        type="button"
                        onClick={() =>
                          selectPerson(
                            member.id
                          )
                        }
                        className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition last:border-0 ${
                          selected
                            ? "bg-blue-50"
                            : "hover:bg-slate-50"
                        }`}
                      >

                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-blue-700 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >

                          <UserRound
                            size={19}
                          />

                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="truncate font-black text-slate-900">
                            {
                              member.full_name
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">

                            {
                              member.account_number ||
                              member.phone ||
                              member.email ||
                              "GROW Member"
                            }

                          </p>

                          {staffRecord && (
                            <p className="mt-1 truncate text-xs font-black text-blue-700">
                              {
                                staffRecord.custom_role_name ||
                                staffRecord.display_role_name
                              }
                            </p>
                          )}

                        </div>

                        {staffRecord && (
                          <BadgeCheck
                            size={17}
                            className="shrink-0 text-emerald-600"
                          />
                        )}

                        <ChevronRight
                          size={17}
                          className="shrink-0 text-slate-300"
                        />

                      </button>
                    );
                  }
                )}

            </div>

          </aside>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <section>

            {!selectedMember ? (

              <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">

                <div>

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

                    <UserCog
                      size={28}
                    />

                  </div>

                  <h2 className="mt-5 text-xl font-black text-slate-950">
                    Select a Staff Member
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Choose a member from the left. You will then name their role and choose their duties individually.
                  </p>

                </div>

              </div>

            ) : (

              <div className="space-y-6">

                {/* PERSON */}

                <div className="rounded-3xl border border-slate-200 bg-white p-6">

                  <div className="flex items-center gap-4">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

                      <UserRound
                        size={25}
                      />

                    </div>

                    <div className="min-w-0">

                      <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                        Selected Staff
                      </p>

                      <h2 className="mt-1 text-xl font-black text-slate-950">
                        {
                          selectedMember.full_name
                        }
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">

                        {
                          selectedMember.account_number ||
                          selectedMember.email ||
                          selectedMember.phone
                        }

                      </p>

                    </div>

                    {selectedStaff && (
                      <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                        Existing Staff
                      </span>
                    )}

                  </div>

                </div>

                {/* ROLE NAME */}

                <div className="rounded-3xl border border-slate-200 bg-white p-6">

                  <div className="flex items-center gap-3">

                    <ShieldCheck
                      size={21}
                      className="text-blue-700"
                    />

                    <div>

                      <h2 className="font-black text-slate-950">
                        Name This Staff Role
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        You can enter any title you want.
                      </p>

                    </div>

                  </div>

                  <input
                    value={
                      roleName
                    }
                    onChange={(
                      event
                    ) =>
                      setRoleName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Example: Financial Auditor"
                    className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">

                    {[
                      "Financial Auditor",
                      "Loan Officer",
                      "KYC Officer",
                      "Customer Relations Officer",
                      "Accounts Officer",
                    ].map(
                      (
                        example
                      ) => (
                        <button
                          key={
                            example
                          }
                          type="button"
                          onClick={() =>
                            setRoleName(
                              example
                            )
                          }
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {
                            example
                          }
                        </button>
                      )
                    )}

                  </div>

                </div>

                {/* DUTIES */}

                <div className="rounded-3xl border border-slate-200 bg-white p-6">

                  <div>

                    <h2 className="text-lg font-black text-slate-950">
                      Choose Staff Duties
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Tick only the duties this particular staff member should control.
                    </p>

                  </div>

                  <div className="mt-6 space-y-5">

                    {groupedPermissions.map(
                      ([
                        moduleName,
                        modulePermissions,
                      ]) => {
                        const optional =
                          modulePermissions.filter(
                            (
                              permission
                            ) =>
                              permission.permission_key !==
                              "dashboard.view"
                          );

                        const allSelected =
                          optional.length >
                            0 &&
                          optional.every(
                            (
                              permission
                            ) =>
                              selectedPermissions.has(
                                permission.permission_key
                              )
                          );

                        return (
                          <div
                            key={
                              moduleName
                            }
                            className="overflow-hidden rounded-2xl border border-slate-200"
                          >

                            <div className="flex items-center justify-between bg-slate-50 px-5 py-4">

                              <div>

                                <p className="font-black text-slate-900">
                                  {
                                    moduleName
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    modulePermissions.length
                                  }{" "}
                                  permission
                                  {
                                    modulePermissions.length ===
                                    1
                                      ? ""
                                      : "s"
                                  }
                                </p>

                              </div>

                              {optional.length >
                                0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleModule(
                                      modulePermissions
                                    )
                                  }
                                  className="text-xs font-black text-blue-700"
                                >
                                  {
                                    allSelected
                                      ? "Remove All"
                                      : "Select All"
                                  }
                                </button>
                              )}

                            </div>

                            <div className="divide-y divide-slate-100">

                              {modulePermissions.map(
                                (
                                  permission
                                ) => {
                                  const required =
                                    permission.permission_key ===
                                    "dashboard.view";

                                  const checked =
                                    required ||
                                    selectedPermissions.has(
                                      permission.permission_key
                                    );

                                  return (
                                    <label
                                      key={
                                        permission.permission_key
                                      }
                                      className={`flex items-start gap-4 p-5 ${
                                        required
                                          ? "bg-blue-50/40"
                                          : "cursor-pointer hover:bg-slate-50"
                                      }`}
                                    >

                                      <div
                                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                                          checked
                                            ? "border-blue-700 bg-blue-700 text-white"
                                            : "border-slate-300 bg-white"
                                        }`}
                                      >

                                        {checked && (
                                          <Check
                                            size={15}
                                          />
                                        )}

                                      </div>

                                      <input
                                        type="checkbox"
                                        checked={
                                          checked
                                        }
                                        disabled={
                                          required
                                        }
                                        onChange={() =>
                                          togglePermission(
                                            permission.permission_key
                                          )
                                        }
                                        className="hidden"
                                      />

                                      <div>

                                        <div className="flex flex-wrap items-center gap-2">

                                          <p className="text-sm font-black text-slate-900">
                                            {
                                              permission.label
                                            }
                                          </p>

                                          {required && (
                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
                                              REQUIRED
                                            </span>
                                          )}

                                        </div>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                          {
                                            permission.description
                                          }
                                        </p>

                                      </div>

                                    </label>
                                  );
                                }
                              )}

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>

                                {isSuperAdmin &&
                  selectedStaff &&
                  selectedStaff.legacy_role !==
                    "super_admin" && (

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

                    <p className="font-black text-slate-950">
                      Temporary Membership Date Access
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Temporarily allow {selectedStaff.full_name} to enter an older Membership Start Date when adding an existing GROW member.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">

                      <div>
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Access Period
                        </label>

                        <select
                          value={backdateHours}
                          onChange={(event) =>
                            setBackdateHours(
                              event.target.value
                            )
                          }
                          className="form-input mt-2"
                        >
                          <option value="1">
                            1 Hour
                          </option>

                          <option value="4">
                            4 Hours
                          </option>

                          <option value="8">
                            8 Hours
                          </option>

                          <option value="12">
                            12 Hours
                          </option>

                          <option value="24">
                            24 Hours
                          </option>

                          <option value="48">
                            48 Hours
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Reason
                        </label>

                        <input
                          type="text"
                          value={backdateReason}
                          onChange={(event) =>
                            setBackdateReason(
                              event.target.value
                            )
                          }
                          placeholder="Example: Adding migrated members"
                          className="form-input mt-2"
                        />
                      </div>

                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                      <button
                        type="button"
                        disabled={
                          backdateSaving ||
                          backdateReason
                            .trim()
                            .length < 3
                        }
                        onClick={
                          grantBackdateAccess
                        }
                        className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                      >
                        {backdateSaving
                          ? "Processing..."
                          : "Grant Temporary Access"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          backdateSaving
                        }
                        onClick={
                          revokeBackdateAccess
                        }
                        className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700 disabled:opacity-50"
                      >
                        Revoke Access
                      </button>

                    </div>

                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      Access expires automatically and does not change the staff member's normal duties.
                    </p>

                  </div>

                )}
{/* MESSAGES */}

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                    {success}
                  </div>
                )}

                {/* SAVE */}

                <div className="sticky bottom-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="font-black text-slate-900">
                        {
                          selectedPermissions.size
                        }{" "}
                        permissions selected
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Dashboard access is automatically included.
                      </p>

                    </div>

                    <button
                      type="button"
                      disabled={
                        saving ||
                        roleName
                          .trim()
                          .length <
                          2
                      }
                      onClick={
                        saveAccess
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      {saving ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <ShieldCheck
                          size={18}
                        />
                      )}

                      {saving
                        ? "Saving..."
                        : "Save Staff Role & Duties"}

                    </button>

                  </div>

                </div>

              </div>

            )}

          </section>

        </div>

        {/* ====================================================
            CURRENT STAFF SUMMARY
        ==================================================== */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 p-5">

            <h2 className="font-black text-slate-950">
              Current Staff Assignments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Click Edit to change any staff member's role or duties.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-slate-50">

                <tr className="text-left text-xs font-black uppercase text-slate-400">

                  <th className="px-5 py-4">
                    Staff
                  </th>

                  <th className="px-5 py-4">
                    Role Name
                  </th>

                  <th className="px-5 py-4">
                    Duties
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

                {staffList.map(
                  (
                    item
                  ) => (
                    <tr
                      key={
                        item.id
                      }
                      className="border-t border-slate-100"
                    >

                      <td className="px-5 py-5">

                        <p className="font-black text-slate-900">
                          {
                            item.full_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            item.email
                          }
                        </p>

                      </td>

                      <td className="px-5 py-5">

                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">

                          {
                            item.custom_role_name ||
                            item.display_role_name ||
                            "Staff"
                          }

                        </span>

                      </td>

                      <td className="px-5 py-5">

                        <p className="font-black text-slate-900">
                          {
                            item.permissions.length
                          }
                        </p>

                        <p className="text-xs text-slate-500">
                          Assigned duties
                        </p>

                      </td>

                      <td className="px-5 py-5">

                        <span
                          className={
                            item.is_active
                              ? "rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"
                              : "rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700"
                          }
                        >
                          {
                            item.is_active
                              ? "Active"
                              : "Disabled"
                          }
                        </span>

                      </td>

                      <td className="px-5 py-5 text-right">

                        {item.id !==
                          currentUserId && (
                          <button
                            type="button"
                            onClick={() => {
                              selectPerson(
                                item.id
                              );

                              window.scrollTo(
                                {
                                  top: 0,
                                  behavior:
                                    "smooth",
                                }
                              );
                            }}
                            className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Edit Duties
                          </button>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  );
}
