"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type DestinationMode =
  | "member"
  | "general";

type MemberDestination =
  | "wallet"
  | "goal";

type PaymentMethod =
  | "MTN"
  | "ORANGE";

type Member = {
  id: string;
  full_name: string | null;
  account_number: string | null;
  phone: string | null;
};

type Goal = {
  id: string;
  name: string | null;
  target_amount: number | null;
  saved_amount: number | null;
};

type PayInHistoryRow = {
  id: string;
  destination_mode: DestinationMode;
  member_destination: MemberDestination | null;
  member_id: string | null;
  member_name: string | null;
  member_account_number: string | null;
  goal_id: string | null;
  goal_name: string | null;
  grow_transaction_id: string | null;
  payer_name: string;
  payer_phone: string;
  payment_method: PaymentMethod;
  amount: number;
  purpose: string | null;
  reference_note: string | null;
  grow_reference: string;
  status: string;
  provider_status: number | null;
  initiated_by: string;
  staff_name: string | null;
  created_at: string;
  updated_at: string;
};

function formatDateTime(
  value: string | null | undefined
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

function statusClasses(
  status: string
) {
  switch (
    status
      .trim()
      .toLowerCase()
  ) {
    case "successful":
      return "border-green-200 bg-green-50 text-green-700";

    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "cancelled":
      return "border-slate-300 bg-slate-100 text-slate-700";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function formatCfa(
  value: number | null | undefined
) {
  const amount =
    Number(value ?? 0);

  return `${new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 0,
    }
  ).format(
    Number.isFinite(amount)
      ? amount
      : 0
  )} CFA`;
}

function normalizeCameroonPhone(
  value: string
) {
  let digits =
    value.replace(
      /\D/g,
      ""
    );

  if (
    digits.startsWith(
      "00237"
    )
  ) {
    digits =
      digits.slice(5);
  }

  if (
    digits.startsWith(
      "237"
    ) &&
    digits.length === 12
  ) {
    digits =
      digits.slice(3);
  }

  if (
    digits.startsWith(
      "0"
    ) &&
    digits.length === 10
  ) {
    digits =
      digits.slice(1);
  }

  return digits;
}

function isValidCameroonPhone(
  value: string
) {
  return /^6[0-9]{8}$/.test(
    normalizeCameroonPhone(
      value
    )
  );
}

export default function PayInPage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    checkingAccess,
    setCheckingAccess,
  ] = useState(true);

  const [
    accessError,
    setAccessError,
  ] = useState("");

  const [
    destinationMode,
    setDestinationMode,
  ] =
    useState<DestinationMode>(
      "member"
    );

  const [
    memberDestination,
    setMemberDestination,
  ] =
    useState<MemberDestination>(
      "wallet"
    );

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>(
      "MTN"
    );

  const [
    members,
    setMembers,
  ] =
    useState<Member[]>([]);

  const [
    loadingMembers,
    setLoadingMembers,
  ] =
    useState(false);

  const [
    memberSearch,
    setMemberSearch,
  ] =
    useState("");

  const [
    selectedMemberId,
    setSelectedMemberId,
  ] =
    useState("");

  const [
    goals,
    setGoals,
  ] =
    useState<Goal[]>([]);

  const [
    loadingGoals,
    setLoadingGoals,
  ] =
    useState(false);

  const [
    selectedGoalId,
    setSelectedGoalId,
  ] =
    useState("");

  const [
    payerName,
    setPayerName,
  ] =
    useState("");

  const [
    payerPhone,
    setPayerPhone,
  ] =
    useState("");

  const [
    amount,
    setAmount,
  ] =
    useState("");

  const [
    purpose,
    setPurpose,
  ] =
    useState("");

  const [
    referenceNote,
    setReferenceNote,
  ] =
    useState("");

  const [
    formMessage,
    setFormMessage,
  ] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [
    payInHistory,
    setPayInHistory,
  ] = useState<PayInHistoryRow[]>([]);

  const [
    loadingHistory,
    setLoadingHistory,
  ] = useState(false);

  const [
    historyError,
    setHistoryError,
  ] = useState("");

  const loadPayInHistory =
    useCallback(
      async () => {
        setLoadingHistory(true);
        setHistoryError("");

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "admin_list_payins",
            {
              p_limit: 100,
            }
          );

        if (error) {
          setPayInHistory([]);
          setHistoryError(
            `Unable to load Pay-In history: ${error.message}`
          );
          setLoadingHistory(false);
          return;
        }

        setPayInHistory(
          (data ?? []) as PayInHistoryRow[]
        );

        setLoadingHistory(false);
      },
      [supabase]
    );

  // ============================================================
  // PAY-IN HISTORY
  // ============================================================

  useEffect(() => {
    if (
      checkingAccess
    ) {
      return;
    }

    void loadPayInHistory();
  }, [
    checkingAccess,
    loadPayInHistory,
  ]);

  // ============================================================
  // ACCESS CONTROL
  // ============================================================

  useEffect(() => {
    let mounted =
      true;

    async function checkAccess() {
      setCheckingAccess(
        true
      );

      setAccessError(
        ""
      );

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (
        !mounted
      ) {
        return;
      }

      if (
        authError ||
        !authData.user
      ) {
        router.replace(
          "/"
        );
        return;
      }

      const {
        data:
          canInitiatePayIn,
        error:
          permissionError,
      } =
        await supabase.rpc(
          "staff_has_permission",
          {
            p_permission_key:
              "payments.initiate_payin",
          }
        );

      if (
        !mounted
      ) {
        return;
      }

      if (
        permissionError ||
        canInitiatePayIn !==
          true
      ) {
        router.replace(
          "/dashboard"
        );
        return;
      }

      setCheckingAccess(
        false
      );
    }

    void checkAccess();

    return () => {
      mounted =
        false;
    };
  }, [
    router,
    supabase,
  ]);

  // ============================================================
  // LOAD MEMBERS
  // ============================================================

  useEffect(() => {
    if (
      checkingAccess
    ) {
      return;
    }

    let mounted =
      true;

    async function loadMembers() {
      setLoadingMembers(
        true
      );

      setAccessError(
        ""
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(
            "id, full_name, account_number, phone"
          )
          .order(
            "full_name",
            {
              ascending:
                true,
            }
          )
          .limit(
            500
          );

      if (
        !mounted
      ) {
        return;
      }

      if (
        error
      ) {
        setAccessError(
          `Unable to load members: ${error.message}`
        );

        setMembers(
          []
        );

        setLoadingMembers(
          false
        );

        return;
      }

      setMembers(
        (data ?? []) as Member[]
      );

      setLoadingMembers(
        false
      );
    }

    void loadMembers();

    return () => {
      mounted =
        false;
    };
  }, [
    checkingAccess,
    supabase,
  ]);

  // ============================================================
  // LOAD MEMBER GOALS
  // ============================================================

  useEffect(() => {
    if (
      destinationMode !==
        "member" ||
      memberDestination !==
        "goal" ||
      !selectedMemberId
    ) {
      setGoals(
        []
      );

      setSelectedGoalId(
        ""
      );

      return;
    }

    let mounted =
      true;

    async function loadGoals() {
      setLoadingGoals(
        true
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "goals"
          )
          .select(
            "id, name, target_amount, saved_amount"
          )
          .eq(
            "user_id",
            selectedMemberId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (
        !mounted
      ) {
        return;
      }

      if (
        error
      ) {
        setAccessError(
          `Unable to load member goals: ${error.message}`
        );

        setGoals(
          []
        );

        setLoadingGoals(
          false
        );

        return;
      }

      setGoals(
        (data ?? []) as Goal[]
      );

      setLoadingGoals(
        false
      );
    }

    void loadGoals();

    return () => {
      mounted =
        false;
    };
  }, [
    destinationMode,
    memberDestination,
    selectedMemberId,
    supabase,
  ]);

  const filteredMembers =
    useMemo(() => {
      const query =
        memberSearch
          .trim()
          .toLowerCase();

      if (
        !query
      ) {
        return members.slice(
          0,
          25
        );
      }

      return members
        .filter(
          (
            member
          ) => {
            const haystack =
              [
                member.full_name ??
                  "",
                member.account_number ??
                  "",
                member.phone ??
                  "",
              ]
                .join(
                  " "
                )
                .toLowerCase();

            return haystack.includes(
              query
            );
          }
        )
        .slice(
          0,
          25
        );
    }, [
      memberSearch,
      members,
    ]);

  const selectedMember =
    useMemo(
      () =>
        members.find(
          (
            member
          ) =>
            member.id ===
            selectedMemberId
        ) ?? null,
      [
        members,
        selectedMemberId,
      ]
    );

  const selectedGoal =
    useMemo(
      () =>
        goals.find(
          (
            goal
          ) =>
            goal.id ===
            selectedGoalId
        ) ?? null,
      [
        goals,
        selectedGoalId,
      ]
    );

  const numericAmount =
    Number(
      amount
    );

  const phoneValid =
    isValidCameroonPhone(
      payerPhone
    );

  const baseFormValid =
    Number.isFinite(
      numericAmount
    ) &&
    numericAmount > 0 &&
    payerName
      .trim()
      .length >= 2 &&
    phoneValid;

  const memberFormValid =
    destinationMode ===
      "member" &&
    Boolean(
      selectedMember
    ) &&
    (
      memberDestination ===
        "wallet" ||
      Boolean(
        selectedGoal
      )
    );

  const generalFormValid =
    destinationMode ===
      "general" &&
    purpose
      .trim()
      .length >= 2;

  const formValid =
    baseFormValid &&
    (
      memberFormValid ||
      generalFormValid
    );

  function resetDestinationFields(
    mode: DestinationMode
  ) {
    setDestinationMode(
      mode
    );

    setFormMessage(
      ""
    );

    if (
      mode ===
      "general"
    ) {
      setSelectedMemberId(
        ""
      );

      setSelectedGoalId(
        ""
      );

      setMemberDestination(
        "wallet"
      );
    }
  }

  function chooseMember(
    member: Member
  ) {
    setSelectedMemberId(
      member.id
    );

    setMemberSearch(
      member.full_name ??
        member.account_number ??
        member.phone ??
        "Selected member"
    );

    setSelectedGoalId(
      ""
    );

    if (
      !payerName.trim()
    ) {
      setPayerName(
        member.full_name ??
          ""
      );
    }

    if (
      !payerPhone.trim() &&
      member.phone
    ) {
      setPayerPhone(
        member.phone
      );
    }
  }

  async function handlePreparePayIn() {
    setFormMessage("");
    setPaymentReference("");

    if (!formValid || submitting) {
      if (!formValid) {
        setFormMessage(
          "Complete all required fields before initiating the Pay-In."
        );
      }
      return;
    }

    setSubmitting(true);

    try {
      const requestKey =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
              .toString(36)
              .slice(2)}`;

      const {
        data,
        error,
      } = await supabase.functions.invoke(
        "admin-create-grow-payin",
        {
          body: {
            destination_mode: destinationMode,
            member_destination:
              destinationMode === "member"
                ? memberDestination
                : null,
            member_id:
              destinationMode === "member"
                ? selectedMemberId
                : null,
            goal_id:
              destinationMode === "member" &&
              memberDestination === "goal"
                ? selectedGoalId
                : null,
            payer_name: payerName.trim(),
            payer_phone: normalizeCameroonPhone(
              payerPhone
            ),
            payment_method: paymentMethod,
            amount: numericAmount,
            purpose:
              destinationMode === "general"
                ? purpose.trim()
                : null,
            reference_note:
              referenceNote.trim() || null,
            request_key: requestKey,
          },
        }
      );

      if (error) {
        let message =
          error.message ||
          "Unable to initiate Pay-In.";

        const context =
          (error as {
            context?: Response;
          }).context;

        if (context) {
          try {
            const body =
              await context.clone().json();

            if (
              body &&
              typeof body.message === "string"
            ) {
              message = body.message;
            }
          } catch {
            // Keep the Supabase function error message.
          }
        }

        setFormMessage(message);
        return;
      }

      if (
        !data ||
        data.success !== true
      ) {
        setFormMessage(
          typeof data?.message === "string"
            ? data.message
            : "Unable to initiate Pay-In."
        );
        return;
      }

      const reference =
        String(
          data.reference ?? ""
        ).trim();

      setPaymentReference(reference);

      setFormMessage(
        typeof data.message === "string"
          ? data.message
          : "Payment request sent. Confirm with the Mobile Money PIN."
      );

      void loadPayInHistory();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Unable to initiate Pay-In."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (
    checkingAccess
  ) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
          <Loader2
            className="animate-spin"
            size={
              18
            }
          />
          Checking Pay-In access...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* HERO */}

      <section className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-6 text-white md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
              Payments
            </p>

            <h1 className="mt-3 text-2xl font-black md:text-3xl">
              Initiate Pay-In
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Initiate a Mobile Money collection for a member account or for GROW CIG general collections.
            </p>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <CircleDollarSign
              size={
                28
              }
            />
          </div>
        </div>
      </section>

      {accessError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {accessError}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

        {/* FORM */}

        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 md:p-6">

          <div>
            <h2 className="text-lg font-black text-slate-950">
              Pay-In Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose where the successful payment should be recorded.
            </p>
          </div>

          {/* DESTINATION */}

          <div>
            <label className="text-sm font-black text-slate-800">
              Destination
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  resetDestinationFields(
                    "member"
                  )
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  destinationMode ===
                  "member"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    destinationMode ===
                    "member"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    <UserRound
                      size={
                        20
                      }
                    />
                  </div>

                  <div>
                    <p className="font-black text-slate-900">
                      Member Account
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Credit a selected member Wallet or Goal after successful callback.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  resetDestinationFields(
                    "general"
                  )
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  destinationMode ===
                  "general"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    destinationMode ===
                    "general"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    <Building2
                      size={
                        20
                      }
                    />
                  </div>

                  <div>
                    <p className="font-black text-slate-900">
                      GROW General Collection
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Collect directly for GROW without crediting a member balance.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* MEMBER */}

          {destinationMode ===
            "member" && (
            <div className="space-y-5">

              <div>
                <label className="text-sm font-black text-slate-800">
                  Select Member
                </label>

                <div className="relative mt-2">
                  <Search
                    size={
                      18
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={
                      memberSearch
                    }
                    onChange={(
                      event
                    ) => {
                      setMemberSearch(
                        event.target.value
                      );

                      if (
                        selectedMember
                      ) {
                        setSelectedMemberId(
                          ""
                        );

                        setSelectedGoalId(
                          ""
                        );
                      }
                    }}
                    placeholder="Search name, account number or phone"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
                  {loadingMembers ? (
                    <div className="flex items-center gap-2 p-4 text-sm font-semibold text-slate-500">
                      <Loader2
                        className="animate-spin"
                        size={
                          16
                        }
                      />
                      Loading members...
                    </div>
                  ) : filteredMembers.length ===
                    0 ? (
                    <div className="p-4 text-sm font-semibold text-slate-500">
                      No matching members found.
                    </div>
                  ) : (
                    filteredMembers.map(
                      (
                        member
                      ) => {
                        const active =
                          member.id ===
                          selectedMemberId;

                        return (
                          <button
                            key={
                              member.id
                            }
                            type="button"
                            onClick={() =>
                              chooseMember(
                                member
                              )
                            }
                            className={`flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 ${
                              active
                                ? "bg-blue-50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">
                                {member.full_name ??
                                  "Unnamed Member"}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {member.account_number ??
                                  "No account number"}
                                {member.phone
                                  ? ` • ${member.phone}`
                                  : ""}
                              </p>
                            </div>

                            {active && (
                              <CheckCircle2
                                size={
                                  18
                                }
                                className="shrink-0 text-blue-700"
                              />
                            )}
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </div>

              {selectedMember && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Selected Member
                  </p>

                  <p className="mt-2 font-black text-blue-950">
                    {selectedMember.full_name ??
                      "Unnamed Member"}
                  </p>

                  <p className="mt-1 text-sm text-blue-700">
                    {selectedMember.account_number ??
                      "No account number"}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-black text-slate-800">
                  Member Destination
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  <button
                    type="button"
                    onClick={() => {
                      setMemberDestination(
                        "wallet"
                      );

                      setSelectedGoalId(
                        ""
                      );
                    }}
                    className={`rounded-2xl border p-4 text-left ${
                      memberDestination ===
                      "wallet"
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <WalletCards
                      size={
                        20
                      }
                      className="text-blue-700"
                    />

                    <p className="mt-3 font-black text-slate-900">
                      Wallet
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Credit member available Wallet balance.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMemberDestination(
                        "goal"
                      )
                    }
                    className={`rounded-2xl border p-4 text-left ${
                      memberDestination ===
                      "goal"
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <CreditCard
                      size={
                        20
                      }
                      className="text-blue-700"
                    />

                    <p className="mt-3 font-black text-slate-900">
                      Goal
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Credit a specific savings goal.
                    </p>
                  </button>
                </div>
              </div>

              {memberDestination ===
                "goal" && (
                <div>
                  <label className="text-sm font-black text-slate-800">
                    Savings Goal
                  </label>

                  <select
                    value={
                      selectedGoalId
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedGoalId(
                        event.target.value
                      )
                    }
                    disabled={
                      !selectedMemberId ||
                      loadingGoals
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {loadingGoals
                        ? "Loading goals..."
                        : !selectedMemberId
                        ? "Select a member first"
                        : goals.length ===
                          0
                        ? "No goals available"
                        : "Choose goal"}
                    </option>

                    {goals.map(
                      (
                        goal
                      ) => (
                        <option
                          key={
                            goal.id
                          }
                          value={
                            goal.id
                          }
                        >
                          {goal.name ??
                            "Savings Goal"}{" "}
                          —{" "}
                          {formatCfa(
                            goal.saved_amount
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* PAYER */}

          <div className="grid gap-4 sm:grid-cols-2">

            <div>
              <label className="text-sm font-black text-slate-800">
                Payer Name
              </label>

              <input
                value={
                  payerName
                }
                onChange={(
                  event
                ) =>
                  setPayerName(
                    event.target.value
                  )
                }
                placeholder="Full name"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-slate-800">
                Mobile Number
              </label>

              <input
                value={
                  payerPhone
                }
                onChange={(
                  event
                ) =>
                  setPayerPhone(
                    event.target.value
                  )
                }
                placeholder="6XXXXXXXX"
                inputMode="tel"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {payerPhone &&
                !phoneValid && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  Enter a valid Cameroon Mobile Money number.
                </p>
              )}
            </div>
          </div>

          {/* NETWORK */}

          <div>
            <label className="text-sm font-black text-slate-800">
              Mobile Money Network
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  setPaymentMethod(
                    "MTN"
                  )
                }
                className={`rounded-2xl border p-4 text-left ${
                  paymentMethod ===
                  "MTN"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <Smartphone
                  size={
                    20
                  }
                  className="text-blue-700"
                />

                <p className="mt-3 font-black text-slate-900">
                  MTN Mobile Money
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPaymentMethod(
                    "ORANGE"
                  )
                }
                className={`rounded-2xl border p-4 text-left ${
                  paymentMethod ===
                  "ORANGE"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <Smartphone
                  size={
                    20
                  }
                  className="text-blue-700"
                />

                <p className="mt-3 font-black text-slate-900">
                  Orange Money
                </p>
              </button>
            </div>
          </div>

          {/* AMOUNT */}

          <div>
            <label className="text-sm font-black text-slate-800">
              Amount
            </label>

            <div className="relative mt-2">
              <input
                value={
                  amount
                }
                onChange={(
                  event
                ) =>
                  setAmount(
                    event.target.value.replace(
                      /[^0-9.]/g,
                      ""
                    )
                  )
                }
                placeholder="0"
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-16 text-sm font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                CFA
              </span>
            </div>
          </div>

          {/* GENERAL COLLECTION */}

          {destinationMode ===
            "general" && (
            <div>
              <label className="text-sm font-black text-slate-800">
                Purpose / Category
              </label>

              <select
                value={
                  purpose
                }
                onChange={(
                  event
                ) =>
                  setPurpose(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Choose purpose
                </option>

                <option value="Registration Fee">
                  Registration Fee
                </option>

                <option value="Contribution">
                  Contribution
                </option>

                <option value="Service Payment">
                  Service Payment
                </option>

                <option value="Loan Repayment">
                  Loan Repayment
                </option>

                <option value="Investment">
                  Investment
                </option>

                <option value="General Collection">
                  General Collection
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-black text-slate-800">
              Reference / Note
            </label>

            <textarea
              value={
                referenceNote
              }
              onChange={(
                event
              ) =>
                setReferenceNote(
                  event.target.value
                )
              }
              placeholder="Optional internal reference or payment note"
              rows={
                3
              }
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {formMessage && (
            <div
              className={`rounded-2xl border p-4 text-sm font-semibold leading-6 ${
                paymentReference
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <p>{formMessage}</p>

              {paymentReference && (
                <p className="mt-2 font-black">
                  GROW Reference: {paymentReference}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={
              handlePreparePayIn
            }
            disabled={
              !formValid ||
              submitting
            }
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black transition ${
              formValid &&
              !submitting
                ? "bg-blue-700 text-white hover:bg-blue-800"
                : "cursor-not-allowed bg-slate-200 text-slate-500"
            }`}
          >
            {submitting ? (
              <Loader2
                className="animate-spin"
                size={19}
              />
            ) : (
              <CircleDollarSign
                size={19}
              />
            )}

            {submitting
              ? "Sending Mobile Money Request..."
              : "Initiate Pay-In"}
          </button>

          <p className="text-center text-xs font-semibold leading-5 text-slate-500">
            A successful request sends a Mobile Money prompt to the payer. Member Wallet or Goal balances are credited only after the provider callback confirms payment.
          </p>
        </div>

        {/* SUMMARY */}

        <aside className="space-y-5">

          <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
            <h2 className="font-black text-slate-950">
              Payment Summary
            </h2>

            <div className="mt-5 space-y-4">

              <SummaryRow
                label="Destination"
                value={
                  destinationMode ===
                  "member"
                    ? "Member Account"
                    : "GROW General Collection"
                }
              />

              {destinationMode ===
                "member" && (
                <>
                  <SummaryRow
                    label="Member"
                    value={
                      selectedMember?.full_name ??
                      "Not selected"
                    }
                  />

                  <SummaryRow
                    label="Credit To"
                    value={
                      memberDestination ===
                      "wallet"
                        ? "Wallet"
                        : selectedGoal?.name ??
                          "Goal not selected"
                    }
                  />
                </>
              )}

              {destinationMode ===
                "general" && (
                <SummaryRow
                  label="Purpose"
                  value={
                    purpose ||
                    "Not selected"
                  }
                />
              )}

              <SummaryRow
                label="Payer"
                value={
                  payerName ||
                  "Not entered"
                }
              />

              <SummaryRow
                label="Phone"
                value={
                  payerPhone ||
                  "Not entered"
                }
              />

              <SummaryRow
                label="Network"
                value={
                  paymentMethod
                }
              />

              <SummaryRow
                label="Amount"
                value={
                  Number.isFinite(
                    numericAmount
                  ) &&
                  numericAmount >
                    0
                    ? formatCfa(
                        numericAmount
                      )
                    : "0 CFA"
                }
                strong
              />
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
                <ShieldCheck
                  size={
                    21
                  }
                />
              </div>

              <div>
                <h3 className="font-black text-blue-950">
                  Callback Protected
                </h3>

                <p className="mt-2 text-sm leading-6 text-blue-700">
                  Member balances must only change after the payment provider confirms a successful transaction. General collections must never invoke member Wallet or Goal credit logic.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
            <h3 className="font-black text-slate-950">
              Live Payment Flow
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The admin request is registered before SwyChr/AccountPe is called. The callback then settles either the selected member destination or the GROW General Collection without mixing the two flows.
            </p>
          </div>
        </aside>
      </section>

      {/* PAY-IN HISTORY */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <div className="flex items-center gap-2">
              <History
                size={20}
                className="text-blue-700"
              />

              <h2 className="text-lg font-black text-slate-950">
                Pay-In History
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Member Pay-Ins and GROW General Collections initiated from this admin module.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadPayInHistory()
            }
            disabled={
              loadingHistory
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                loadingHistory
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {historyError && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 md:px-6">
            {historyError}
          </div>
        )}

        {loadingHistory &&
        payInHistory.length === 0 ? (
          <div className="flex items-center justify-center gap-3 px-5 py-12 text-sm font-bold text-slate-500">
            <Loader2
              className="animate-spin"
              size={18}
            />

            Loading Pay-In history...
          </div>
        ) : payInHistory.length === 0 ? (
          <div className="px-5 py-12 text-center md:px-6">
            <Clock3
              size={28}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 font-black text-slate-800">
              No Pay-Ins recorded yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Successful and pending Pay-Ins will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4">
                      Payer
                    </th>

                    <th className="px-5 py-4">
                      Destination
                    </th>

                    <th className="px-5 py-4">
                      Amount
                    </th>

                    <th className="px-5 py-4">
                      Network
                    </th>

                    <th className="px-5 py-4">
                      Purpose
                    </th>

                    <th className="px-5 py-4">
                      Reference
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Initiated By
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {payInHistory.map(
                    (
                      item
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                        className="align-top hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatDateTime(
                            item.created_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-slate-900">
                            {item.payer_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.payer_phone}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-slate-900">
                            {item.destination_mode ===
                            "general"
                              ? "GROW General Collection"
                              : item.member_name ??
                                "Member Account"}
                          </p>

                          {item.destination_mode ===
                            "member" && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.member_destination ===
                              "goal"
                                ? item.goal_name ??
                                  "Savings Goal"
                                : "Wallet"}
                              {item.member_account_number
                                ? ` • ${item.member_account_number}`
                                : ""}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-blue-800">
                          {formatCfa(
                            item.amount
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-slate-700">
                          {item.payment_method}
                        </td>

                        <td className="max-w-[220px] px-5 py-4">
                          <p className="truncate text-sm font-semibold text-slate-700">
                            {item.purpose ??
                              (item.destination_mode ===
                              "member"
                                ? "Member Pay-In"
                                : "—")}
                          </p>

                          {item.reference_note && (
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {item.reference_note}
                            </p>
                          )}
                        </td>

                        <td className="max-w-[230px] px-5 py-4">
                          <p className="break-all text-xs font-black text-slate-700">
                            {item.grow_reference}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${statusClasses(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {item.staff_name ??
                            "Staff"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {payInHistory.map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.id
                    }
                    className="space-y-4 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900">
                          {item.payer_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(
                            item.created_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${statusClasses(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <HistoryItem
                        label="Destination"
                        value={
                          item.destination_mode ===
                          "general"
                            ? "GROW General Collection"
                            : item.member_name ??
                              "Member Account"
                        }
                      />

                      <HistoryItem
                        label="Amount"
                        value={
                          formatCfa(
                            item.amount
                          )
                        }
                        strong
                      />

                      <HistoryItem
                        label="Network"
                        value={
                          item.payment_method
                        }
                      />

                      <HistoryItem
                        label="Credit To"
                        value={
                          item.destination_mode ===
                          "general"
                            ? item.purpose ??
                              "General Collection"
                            : item.member_destination ===
                              "goal"
                            ? item.goal_name ??
                              "Savings Goal"
                            : "Wallet"
                        }
                      />
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        GROW Reference
                      </p>

                      <p className="mt-1 break-all text-xs font-black text-slate-700">
                        {item.grow_reference}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function HistoryItem({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 ${
          strong
            ? "font-black text-blue-800"
            : "font-black text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
      <span className="text-sm font-semibold text-slate-500">
        {label}
      </span>

      <span className={`max-w-[60%] text-right text-sm ${
        strong
          ? "font-black text-blue-800"
          : "font-black text-slate-900"
      }`}>
        {value}
      </span>
    </div>
  );
}
