"use client";

import Link from "next/link";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  HandCoins,
  Loader2,
  Plus,
  Search,
  UserCheck,
  UserMinus,
  Users,
  WalletCards,
  X,
} from "lucide-react";

// ================================================================
// TYPES
// ================================================================

type Member = {
  user_id: string;

  full_name: string | null;
  email: string | null;
  phone: string | null;

  account_number: string | null;
  referral_code: string | null;

  joined_at: string | null;

  wallet_balance:
    | number
    | string
    | null;

  locked_balance:
    | number
    | string
    | null;

  goal_savings:
    | number
    | string
    | null;

  total_savings:
    | number
    | string
    | null;

  active_goal_count:
    | number
    | string
    | null;

  kyc_status:
    | string
    | null;

  active_loan_count:
    | number
    | string
    | null;

  pending_loan_count:
    | number
    | string
    | null;

  referral_earnings:
    | number
    | string
    | null;

  membership_three_months:
    | boolean
    | null;

  member_activity_status:
    | string
    | null;
};

type FilterType =
  | "all"
  | "active"
  | "inactive"
  | "active_goal"
  | "no_goal"
  | "kyc_approved"
  | "kyc_pending"
  | "loan_eligible"
  | "active_loan"
  | "pending_loan";

type SortField =
  | "joined_at"
  | "full_name"
  | "wallet_balance"
  | "goal_savings"
  | "total_savings";

type Props = {
  members: Member[];
  staffName: string;
  staffRole: string;
};

type CreateMemberForm = {
  full_name: string;
  phone: string;
  email: string;
  password: string;

  date_of_birth: string;
  place_of_birth: string;

  current_location: string;
  occupation: string;

  registration_fee_paid: string;
};

// ================================================================
// HELPERS
// ================================================================

function numberValue(
  value:
    | number
    | string
    | null
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
) {
  return `${numberValue(
    value
  ).toLocaleString()} CFA`;
}

function date(
  value:
    | string
    | null
) {
  if (!value) {
    return "Ã¢â‚¬â€";
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

function label(
  value:
    | string
    | null
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

// ================================================================
// FILTERS
// ================================================================

const filters: {
  key: FilterType;
  label: string;
}[] = [
  {
    key: "all",
    label: "All",
  },
  {
    key: "active",
    label: "Active",
  },
  {
    key: "inactive",
    label: "Inactive",
  },
  {
    key: "active_goal",
    label: "Active Goal",
  },
  {
    key: "no_goal",
    label: "No Goal",
  },
  {
    key: "kyc_approved",
    label: "KYC Approved",
  },
  {
    key: "kyc_pending",
    label: "KYC Pending",
  },
  {
    key: "loan_eligible",
    label: "Loan Eligible",
  },
  {
    key: "active_loan",
    label: "Active Loan",
  },
  {
    key: "pending_loan",
    label: "Pending Loan",
  },
];

type RegistrationRecoveryResult = {
  success?: boolean;
  billing_month?: string | null;
  processed_members?: number | null;
  total_recovered?: number | string | null;
  already_processed_this_month?: number | null;
  insufficient_balance?: number | null;
  missing_wallet?: number | null;
};

const initialMemberForm:
  CreateMemberForm = {
  full_name: "",
  phone: "",
  email: "",
  password: "",

  date_of_birth: "",
  place_of_birth: "",

  current_location: "",
  occupation: "",

  registration_fee_paid:
    "0",
};

// ================================================================
// COMPONENT
// ================================================================

export default function MembersTable({
  members,
  staffName,
  staffRole,
}: Props) {
  const router =
    useRouter();

  // ==============================================================
  // EXISTING MEMBER TABLE STATE
  // ==============================================================

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
      "joined_at"
    );

  const [
    ascending,
    setAscending,
  ] =
    useState(false);

  const [
    page,
    setPage,
  ] =
    useState(1);

  const perPage = 20;

  // ==============================================================
  // MANUAL MEMBER REGISTRATION STATE
  // ==============================================================

  const [
    showCreateMember,
    setShowCreateMember,
  ] =
    useState(false);

  const [
    createForm,
    setCreateForm,
  ] =
    useState<CreateMemberForm>(
      initialMemberForm
    );

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    createError,
    setCreateError,
  ] =
    useState("");

  const [
    createSuccess,
    setCreateSuccess,
  ] =
    useState("");

  // ==============================================================
  // STAFF PERMISSION
  // ==============================================================

  // ==============================================================
  // REGISTRATION FEE RECOVERY
  // ==============================================================

  const [
    recoveringRegistrationFees,
    setRecoveringRegistrationFees,
  ] = useState(false);

  const [
    registrationRecoveryError,
    setRegistrationRecoveryError,
  ] = useState("");

  const [
    registrationRecoveryResult,
    setRegistrationRecoveryResult,
  ] =
    useState<RegistrationRecoveryResult | null>(
      null
    );

  const canCreateMember =
    staffRole ===
      "super_admin" ||
    staffRole ===
      "finance_admin" ||
    staffRole ===
      "pos_staff";

  // ==============================================================
  // FILTER + SEARCH + SORT
  // ==============================================================

  const filteredMembers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        members.filter(
          (member) => {
            const matchesSearch =
              query.length ===
                0 ||
              member.full_name
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              member.email
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              member.phone
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              member.account_number
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              member.referral_code
                ?.toLowerCase()
                .includes(
                  query
                );

            if (
              !matchesSearch
            ) {
              return false;
            }

            const activeGoals =
              numberValue(
                member.active_goal_count
              );

            const activeLoans =
              numberValue(
                member.active_loan_count
              );

            const pendingLoans =
              numberValue(
                member.pending_loan_count
              );

            switch (
              filter
            ) {
              case "active":
                return (
                  member.member_activity_status ===
                  "active"
                );

              case "inactive":
                return (
                  member.member_activity_status ===
                  "inactive"
                );

              case "active_goal":
                return (
                  activeGoals >
                  0
                );

              case "no_goal":
                return (
                  activeGoals ===
                  0
                );

              case "kyc_approved":
                return (
                  member.kyc_status
                    ?.toLowerCase() ===
                  "approved"
                );

              case "kyc_pending":
                return (
                  member.kyc_status
                    ?.toLowerCase() !==
                  "approved"
                );

              case "loan_eligible":
                return (
                  member.membership_three_months ===
                    true &&
                  activeLoans ===
                    0 &&
                  pendingLoans ===
                    0
                );

              case "active_loan":
                return (
                  activeLoans >
                  0
                );

              case "pending_loan":
                return (
                  pendingLoans >
                  0
                );

              case "all":
              default:
                return true;
            }
          }
        );

      result.sort(
        (
          a,
          b
        ) => {
          let first:
            | string
            | number = "";

          let second:
            | string
            | number = "";

          switch (
            sortField
          ) {
            case "full_name":
              first =
                a.full_name?.toLowerCase() ??
                "";

              second =
                b.full_name?.toLowerCase() ??
                "";

              break;

            case "wallet_balance":
              first =
                numberValue(
                  a.wallet_balance
                );

              second =
                numberValue(
                  b.wallet_balance
                );

              break;

            case "goal_savings":
              first =
                numberValue(
                  a.goal_savings
                );

              second =
                numberValue(
                  b.goal_savings
                );

              break;

            case "total_savings":
              first =
                numberValue(
                  a.total_savings
                );

              second =
                numberValue(
                  b.total_savings
                );

              break;

            case "joined_at":
            default:
              first =
                a.joined_at
                  ? new Date(
                      a.joined_at
                    ).getTime()
                  : 0;

              second =
                b.joined_at
                  ? new Date(
                      b.joined_at
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
      members,
      search,
      filter,
      sortField,
      ascending,
    ]);

  // ==============================================================
  // PAGINATION
  // ==============================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredMembers.length /
          perPage
      )
    );

  const currentPage =
    Math.min(
      page,
      totalPages
    );

  const visibleMembers =
    filteredMembers.slice(
      (
        currentPage -
        1
      ) *
        perPage,
      currentPage *
        perPage
    );

  // ==============================================================
  // SUMMARY
  // ==============================================================

  const activeMembers =
    members.filter(
      (member) =>
        member.member_activity_status ===
        "active"
    ).length;

  const inactiveMembers =
    members.length -
    activeMembers;

  const loanEligible =
    members.filter(
      (member) => {
        return (
          member.membership_three_months ===
            true &&
          numberValue(
            member.active_loan_count
          ) ===
            0 &&
          numberValue(
            member.pending_loan_count
          ) ===
            0
        );
      }
    ).length;

  // ==============================================================
  // FILTER ACTION
  // ==============================================================

  function chooseFilter(
    value: FilterType
  ) {
    setFilter(
      value
    );

    setPage(1);
  }

  // ==============================================================
  // SORT ACTION
  // ==============================================================

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

  // ==============================================================
  // CREATE FORM FIELD
  // ==============================================================

  function updateCreateField(
    field:
      keyof CreateMemberForm,
    value: string
  ) {
    setCreateForm(
      (current) => ({
        ...current,
        [field]:
          value,
      })
    );
  }

  // ==============================================================
  // OPEN CREATE MEMBER
  // ==============================================================

  function openCreateMember() {
    setCreateError("");
    setCreateSuccess("");

    setCreateForm(
      initialMemberForm
    );

    setShowPassword(
      false
    );

    setShowCreateMember(
      true
    );
  }

  // ==============================================================
  // CLOSE CREATE MEMBER
  // ==============================================================

  function closeCreateMember() {
    if (creating) {
      return;
    }

    setShowCreateMember(
      false
    );

    setCreateError("");
    setCreateSuccess("");
  }

  // ==============================================================
  // CREATE MEMBER
  // ==============================================================

  async function handleCreateMember(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (creating) {
      return;
    }

    setCreateError("");
    setCreateSuccess("");

    const fullName =
      createForm.full_name.trim();

    const phone =
      createForm.phone.trim();

    const email =
      createForm.email
        .trim()
        .toLowerCase();

    const password =
      createForm.password.trim();

    if (
      fullName.length <
      2
    ) {
      setCreateError(
        "Enter the member's full name."
      );

      return;
    }

    if (
      phone.length <
      6
    ) {
      setCreateError(
        "Enter a valid phone number."
      );

      return;
    }

    if (
      !email ||
      !email.includes(
        "@"
      )
    ) {
      setCreateError(
        "Enter a valid email address."
      );

      return;
    }

    if (
      password.length <
      8
    ) {
      setCreateError(
        "Temporary password must contain at least 8 characters."
      );

      return;
    }

    const registrationFeePaid =
      Number(
        createForm.registration_fee_paid ||
          0
      );

    if (
      Number.isNaN(
        registrationFeePaid
      ) ||
      registrationFeePaid <
        0
    ) {
      setCreateError(
        "Registration fee paid is invalid."
      );

      return;
    }

    setCreating(
      true
    );

    try {
      const response =
        await fetch(
          "/api/members/create",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  full_name:
                    fullName,

                  phone,

                  email,

                  password,

                  date_of_birth:
                    createForm.date_of_birth ||
                    null,

                  place_of_birth:
                    createForm.place_of_birth.trim(),

                  current_location:
                    createForm.current_location.trim(),

                  occupation:
                    createForm.occupation.trim(),

                  registration_fee_paid:
                    registrationFeePaid,
                }
              ),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          result?.error ??
            "Unable to create member."
        );
      }

      const accountNumber =
        result?.member
          ?.account_number;

      setCreateSuccess(
        accountNumber
          ? `Member created successfully. Account Number: ${accountNumber}`
          : "Member created successfully."
      );

      setCreateForm(
        initialMemberForm
      );

      setShowPassword(
        false
      );

      // ----------------------------------------------------------
      // Refresh server component so new member appears in table.
      // ----------------------------------------------------------

      router.refresh();

      // ----------------------------------------------------------
      // Keep success message visible briefly.
      // ----------------------------------------------------------

      window.setTimeout(
        () => {
          setShowCreateMember(
            false
          );

          setCreateSuccess(
            ""
          );
        },
        1800
      );
    } catch (
      error: unknown
    ) {
      const message =
        error instanceof
        Error
          ? error.message
          : "Unable to create member.";

      setCreateError(
        message
      );
    } finally {
      setCreating(
        false
      );
    }
  }

  // ==============================================================
  // PAGE
  // ==============================================================

  // ==============================================================
  // RECOVER REGISTRATION FEES
  // ==============================================================

  async function recoverRegistrationFees() {
    setRegistrationRecoveryError("");
    setRegistrationRecoveryResult(null);

    const confirmed =
      window.confirm(
        "Recover this month's registration fees now?" +
          "\n\nIncomplete members will be charged up to 1,000 CFA from their available Wallet balance." +
          "\n\nMembers already processed this month will not be charged again."
      );

    if (!confirmed) {
      return;
    }

    setRecoveringRegistrationFees(true);

    try {
      const response =
        await fetch(
          "/api/members/recover-registration-fees",
          {
            method: "POST",
          }
        );

      const result =
        (await response.json()) as
          RegistrationRecoveryResult & {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          result?.error ??
            "Unable to recover registration fees."
        );
      }

      setRegistrationRecoveryResult(
        result
      );

      router.refresh();
    } catch (
      error: unknown
    ) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to recover registration fees.";

      setRegistrationRecoveryError(
        message
      );
    } finally {
      setRecoveringRegistrationFees(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/dashboard"
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              Ã¢â€ Â Dashboard
            </Link>

            <h1 className="mt-2 text-2xl font-black text-slate-950">
              Members
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage and monitor GROW CIG members.
            </p>

          </div>

          <div className="flex items-center gap-4">

            {/* ==================================================
                ADD MEMBER
            ================================================== */}

            {(
              staffRole === "super_admin" ||
              staffRole === "finance_admin"
            ) && (
              <button
                type="button"
                onClick={
                  recoverRegistrationFees
                }
                disabled={
                  recoveringRegistrationFees
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {recoveringRegistrationFees ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <HandCoins
                    size={18}
                  />
                )}

                {recoveringRegistrationFees
                  ? "Recovering..."
                  : "Recover Registration Fees"}
              </button>
            )}
            {canCreateMember && (
              <button
                type="button"
                onClick={
                  openCreateMember
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
              >
                <Plus
                  size={18}
                />

                Add Member
              </button>
            )}

            <div className="hidden text-right md:block">

              <p className="text-sm font-bold text-slate-900">
                {staffName}
              </p>

              <p className="text-xs text-slate-500">
                {label(
                  staffRole
                )}
              </p>

            </div>

          </div>

        </div>

      </header>

      {registrationRecoveryError && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-4 md:px-8">
          <div className="mx-auto max-w-[1600px] text-sm font-bold text-red-700">
            {registrationRecoveryError}
          </div>
        </div>
      )}

      {registrationRecoveryResult && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4 md:px-8">

          <div className="mx-auto max-w-[1600px]">

            <p className="text-sm font-black text-emerald-800">
              Registration fee recovery completed
            </p>

            <p className="mt-1 text-sm text-emerald-700">
              Charged:{" "}
              {registrationRecoveryResult
                .processed_members ?? 0}{" "}
              members
              {" | "}
              Recovered:{" "}
              {money(
                registrationRecoveryResult
                  .total_recovered ?? 0
              )}
              {" | "}
              Insufficient balance:{" "}
              {registrationRecoveryResult
                .insufficient_balance ?? 0}
              {" | "}
              Already processed:{" "}
              {registrationRecoveryResult
                .already_processed_this_month ?? 0}
              {" | "}
              Missing wallet:{" "}
              {registrationRecoveryResult
                .missing_wallet ?? 0}
            </p>

          </div>

        </div>
      )}

      {/* ========================================================
          MAIN CONTENT
      ======================================================== */}

      <div className="mx-auto max-w-[1600px] p-5 md:p-8">

        {/* ======================================================
            SUMMARY CARDS
        ====================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            icon={Users}
            label="Total Members"
            value={
              members.length.toString()
            }
          />

          <SummaryCard
            icon={
              UserCheck
            }
            label="Active"
            value={
              activeMembers.toString()
            }
          />

          <SummaryCard
            icon={
              UserMinus
            }
            label="Inactive"
            value={
              inactiveMembers.toString()
            }
          />

          <SummaryCard
            icon={
              HandCoins
            }
            label="Loan Eligible"
            value={
              loanEligible.toString()
            }
          />

        </section>

        {/* ======================================================
            MEMBER TABLE CONTAINER
        ====================================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white">

          {/* ====================================================
              SEARCH + FILTERS
          ==================================================== */}

          <div className="border-b border-slate-200 p-5">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              {/* SEARCH */}

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

                    setPage(1);
                  }}
                  placeholder="Search name, phone, email, account number..."
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
                      size={17}
                    />
                  </button>
                )}

              </div>

              {/* FILTERS */}

              <div className="flex flex-wrap items-center gap-2">

                <Filter
                  size={17}
                  className="text-slate-400"
                />

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
                      {item.label}
                    </button>
                  )
                )}

              </div>

            </div>

            {/* ==================================================
                SORTING
            ================================================== */}

            <div className="mt-4 flex flex-wrap items-center gap-2">

              <span className="text-xs font-semibold text-slate-400">
                Sort:
              </span>

              <SortButton
                label="Registration"
                active={
                  sortField ===
                  "joined_at"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "joined_at"
                  )
                }
              />

              <SortButton
                label="Name"
                active={
                  sortField ===
                  "full_name"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "full_name"
                  )
                }
              />

              <SortButton
                label="Wallet"
                active={
                  sortField ===
                  "wallet_balance"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "wallet_balance"
                  )
                }
              />

              <SortButton
                label="Goal Savings"
                active={
                  sortField ===
                  "goal_savings"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "goal_savings"
                  )
                }
              />

              <SortButton
                label="Total Savings"
                active={
                  sortField ===
                  "total_savings"
                }
                ascending={
                  ascending
                }
                onClick={() =>
                  chooseSort(
                    "total_savings"
                  )
                }
              />

            </div>

          </div>

          {/* ====================================================
              TABLE
          ==================================================== */}

          <div className="overflow-x-auto">

            <table className="min-w-[1200px] w-full text-left">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>

                  <th className="px-5 py-4">
                    Member
                  </th>

                  <th className="px-5 py-4">
                    Registered
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Wallet
                  </th>

                  <th className="px-5 py-4">
                    Goals
                  </th>

                  <th className="px-5 py-4">
                    Total Savings
                  </th>

                  <th className="px-5 py-4">
                    KYC
                  </th>

                  <th className="px-5 py-4">
                    Loan
                  </th>

                  <th className="px-5 py-4">
                    Eligibility
                  </th>

                  <th className="px-5 py-4">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {visibleMembers.map(
                  (member) => {
                    const activeGoals =
                      numberValue(
                        member.active_goal_count
                      );

                    const activeLoans =
                      numberValue(
                        member.active_loan_count
                      );

                    const pendingLoans =
                      numberValue(
                        member.pending_loan_count
                      );

                    return (
                      <tr
                        key={
                          member.user_id
                        }
                        className="hover:bg-slate-50"
                      >

                        {/* ========================================
                            MEMBER
                        ======================================== */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-700">
                              {(member.full_name ??
                                "M")
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </div>

                            <div>

                              <p className="font-bold text-slate-900">
                                {member.full_name ??
                                  "Member"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {member.account_number ??
                                  "No account number"}
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* ========================================
                            REGISTERED
                        ======================================== */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2 text-sm">

                            <CalendarDays
                              size={16}
                              className="text-slate-400"
                            />

                            {date(
                              member.joined_at
                            )}

                          </div>

                        </td>

                        {/* ========================================
                            STATUS
                        ======================================== */}

                        <td className="px-5 py-4">

                          <StatusPill
                            value={
                              member.member_activity_status ===
                              "active"
                                ? "Active"
                                : "Inactive"
                            }
                            type={
                              member.member_activity_status ===
                              "active"
                                ? "success"
                                : "neutral"
                            }
                          />

                        </td>

                        {/* ========================================
                            WALLET
                        ======================================== */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <WalletCards
                              size={17}
                              className="text-blue-700"
                            />

                            <div>

                              <p className="font-bold text-slate-900">
                                {money(
                                  member.wallet_balance
                                )}
                              </p>

                              {numberValue(
                                member.locked_balance
                              ) >
                                0 && (
                                <p className="text-xs text-amber-600">
                                  {money(
                                    member.locked_balance
                                  )}{" "}
                                  locked
                                </p>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* ========================================
                            GOALS
                        ======================================== */}

                        <td className="px-5 py-4">

                          <p className="font-bold text-slate-900">
                            {money(
                              member.goal_savings
                            )}
                          </p>

                          <p className="text-xs text-slate-500">
                            {activeGoals} active
                          </p>

                        </td>

                        {/* ========================================
                            TOTAL SAVINGS
                        ======================================== */}

                        <td className="px-5 py-4 font-black text-slate-950">
                          {money(
                            member.total_savings
                          )}
                        </td>

                        {/* ========================================
                            KYC
                        ======================================== */}

                        <td className="px-5 py-4">

                          <StatusPill
                            value={label(
                              member.kyc_status
                            )}
                            type={
                              member.kyc_status
                                ?.toLowerCase() ===
                              "approved"
                                ? "success"
                                : "warning"
                            }
                          />

                        </td>

                        {/* ========================================
                            LOAN
                        ======================================== */}

                        <td className="px-5 py-4">

                          {activeLoans >
                          0 ? (
                            <StatusPill
                              value="Active Loan"
                              type="danger"
                            />
                          ) : pendingLoans >
                            0 ? (
                            <StatusPill
                              value="Pending"
                              type="warning"
                            />
                          ) : (
                            <StatusPill
                              value="No Loan"
                              type="neutral"
                            />
                          )}

                        </td>

                        {/* ========================================
                            ELIGIBILITY
                        ======================================== */}

                        <td className="px-5 py-4">

                          <StatusPill
                            value={
                              member.membership_three_months
                                ? "3 Months Reached"
                                : "Not Yet"
                            }
                            type={
                              member.membership_three_months
                                ? "success"
                                : "warning"
                            }
                          />

                        </td>

                        {/* ========================================
                            ACTION
                        ======================================== */}

                        <td className="px-5 py-4">

                          <Link
                            href={`/members/${member.user_id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                          >
                            View

                            <ChevronRight
                              size={15}
                            />
                          </Link>

                        </td>

                      </tr>
                    );
                  }
                )}

                {/* ==============================================
                    EMPTY STATE
                ============================================== */}

                {visibleMembers.length ===
                  0 && (
                  <tr>

                    <td
                      colSpan={
                        10
                      }
                      className="px-5 py-16 text-center"
                    >

                      <Users
                        size={36}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 font-bold text-slate-700">
                        No members found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Try changing the search or filter.
                      </p>

                    </td>

                  </tr>
                )}

              </tbody>

            </table>

          </div>

          {/* ====================================================
              PAGINATION
          ==================================================== */}

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">

            <p className="text-sm text-slate-500">
              {filteredMembers.length} members
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
                className="rounded-lg border p-2 disabled:opacity-30"
              >
                <ChevronLeft
                  size={18}
                />
              </button>

              <span className="text-sm font-bold">
                {currentPage} /{" "}
                {totalPages}
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
                className="rounded-lg border p-2 disabled:opacity-30"
              >
                <ChevronRight
                  size={18}
                />
              </button>

            </div>

          </div>

        </section>

      </div>

      {/* ========================================================
          ADD MEMBER MODAL
      ======================================================== */}

      {showCreateMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            {/* ==================================================
                MODAL HEADER
            ================================================== */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>

                <p className="text-xl font-black text-slate-950">
                  Add Member
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Register a member from the GROW POS or office.
                </p>

              </div>

              <button
                type="button"
                disabled={
                  creating
                }
                onClick={
                  closeCreateMember
                }
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <X
                  size={20}
                />
              </button>

            </div>

            {/* ==================================================
                FORM
            ================================================== */}

            <form
              onSubmit={
                handleCreateMember
              }
              className="p-6"
            >

              {/* =================================================
                  EXPLANATION
              ================================================= */}

              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">

                <p className="text-sm font-bold text-blue-900">
                  GROW Member Account
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  The system will automatically create the member&apos;s GROW account number, referral code and wallet.
                </p>

              </div>

              {/* =================================================
                  ERRORS
              ================================================= */}

              {createError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {createError}
                </div>
              )}

              {/* =================================================
                  SUCCESS
              ================================================= */}

              {createSuccess && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  {createSuccess}
                </div>
              )}

              {/* =================================================
                  PERSONAL INFORMATION
              ================================================= */}

              <div>

                <p className="text-sm font-black uppercase tracking-wide text-slate-500">
                  Personal Information
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">

                  {/* FULL NAME */}

                  <FormField
                    label="Full Name"
                    required
                  >
                    <input
                      type="text"
                      required
                      value={
                        createForm.full_name
                      }
                      onChange={(
                        event
                      ) =>
                        updateCreateField(
                          "full_name",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Member full name"
                      className="form-input"
                    />
                  </FormField>

                  {/* PHONE */}

                  <FormField
                    label="Phone Number"
                    required
                  >
                    <input
                      type="tel"
                      required
                      value={
                        createForm.phone
                      }
                      onChange={(
                        event
                      ) =>
                        updateCreateField(
                          "phone",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="e.g. 679590967"
                      className="form-input"
                    />
                  </FormField>

                  {/* DATE OF BIRTH */}

                  <FormField
                    label="Date of Birth"
                  >
                    <input
                      type="date"
                      value={
                        createForm.date_of_birth
                      }
                      onChange={(
                        event
                      ) =>
                        updateCreateField(
                          "date_of_birth",
                          event
                            .target
                            .value
                        )
                      }
                      className="form-input"
                    />
                  </FormField>

                  {/* PLACE OF BIRTH */}

                  <FormField
                    label="Place of Birth"
                  >
                    <input
                      type="text"
                      value={
                        createForm.place_of_birth
                      }
                      onChange={(
                        event
                      ) =>
                        updateCreateField(
                          "place_of_birth",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Town / village"
                      className="form-input"
                    />
                  </FormField>

                  {/* LOCATION */}

                  <FormField
                    label="Current Location"
                  >
                    <input
                      type="text"
                      value={
                        createForm.current_location
                      }
                      onChange={(
                        event
                      ) =>
                        updateCreateField(
                          "current_location",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Current town / location"
                      className="form-input"
                    />
                  </FormField>

                  {/* OCCUPATION */}

                  <FormField
                    label="Occupation"
                  >
                    <input
                      type="text"
                      value={
                        createForm.occupation
                      }
                      onChange={(
                        event
                      ) =>
                        updateCreateField(
                          "occupation",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Business, farmer, student..."
                      className="form-input"
                    />
                  </FormField>

                </div>

              </div>

              {/* =================================================
                  LOGIN DETAILS
              ================================================= */}

              <div className="mt-8 border-t border-slate-200 pt-6">

                <p className="text-sm font-black uppercase tracking-wide text-slate-500">
                  Login Information
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  These details allow the member to use the GROW mobile application.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">

                  {/* EMAIL */}

                  <FormField
                    label="Email Address"
                    required
                  >
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={
                        createForm.email
                      }
                      onChange={(
                        event
                      ) =>
                        updateCreateField(
                          "email",
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="member@example.com"
                      className="form-input"
                    />
                  </FormField>

                  {/* TEMP PASSWORD */}

                  <FormField
                    label="Temporary Password"
                    required
                  >

                    <div className="relative">

                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        required
                        minLength={
                          8
                        }
                        autoComplete="new-password"
                        value={
                          createForm.password
                        }
                        onChange={(
                          event
                        ) =>
                          updateCreateField(
                            "password",
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Minimum 8 characters"
                        className="form-input pr-12"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (
                              current
                            ) =>
                              !current
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPassword ? (
                          <EyeOff
                            size={18}
                          />
                        ) : (
                          <Eye
                            size={18}
                          />
                        )}
                      </button>

                    </div>

                  </FormField>

                </div>

              </div>

              {/* =================================================
                  MEMBERSHIP PAYMENT
              ================================================= */}

              <div className="mt-8 border-t border-slate-200 pt-6">

                <p className="text-sm font-black uppercase tracking-wide text-slate-500">
                  Membership
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">

                  <FormField
                    label="Registration Fee Paid"
                  >
                    <div className="relative">

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          createForm.registration_fee_paid
                        }
                        onChange={(
                          event
                        ) =>
                          updateCreateField(
                            "registration_fee_paid",
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="0"
                        className="form-input pr-16"
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        CFA
                      </span>

                    </div>
                  </FormField>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <p className="text-xs font-semibold text-slate-500">
                      Normal Registration Fee
                    </p>

                    <p className="mt-1 text-lg font-black text-slate-950">
                      6,000 CFA
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      The database will continue tracking any unpaid balance.
                    </p>

                  </div>

                </div>

              </div>

              {/* =================================================
                  BUTTONS
              ================================================= */}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  disabled={
                    creating
                  }
                  onClick={
                    closeCreateMember
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creating
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Creating Member...
                    </>
                  ) : (
                    <>
                      <Plus
                        size={18}
                      />

                      Create Member
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ========================================================
          LOCAL FORM INPUT STYLE
      ======================================================== */}

      <style jsx global>{`
        .form-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.8rem 0.9rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .form-input::placeholder {
          color: rgb(148 163 184);
        }

        .form-input:focus {
          border-color: rgb(37 99 235);
          box-shadow:
            0 0 0 4px
            rgb(37 99 235 / 0.1);
        }
      `}</style>

    </main>
  );
}

// ================================================================
// FORM FIELD
// ================================================================

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-bold text-slate-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </span>

      {children}

    </label>
  );
}

// ================================================================
// SUMMARY CARD
// ================================================================

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

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black">
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
// SORT BUTTON
// ================================================================

function SortButton({
  label,
  active,
  ascending,
  onClick,
}: {
  label: string;
  active: boolean;
  ascending: boolean;
  onClick:
    () => void;
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

// ================================================================
// STATUS PILL
// ================================================================

function StatusPill({
  value,
  type,
}: {
  value: string;

  type:
    | "success"
    | "warning"
    | "danger"
    | "neutral";
}) {
  const styles = {
    success:
      "bg-emerald-50 text-emerald-700",

    warning:
      "bg-amber-50 text-amber-700",

    danger:
      "bg-red-50 text-red-700",

    neutral:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[type]}`}
    >
      {value}
    </span>
  );
}