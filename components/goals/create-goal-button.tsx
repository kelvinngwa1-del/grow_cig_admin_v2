"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export type GoalMemberOption = {
  user_id: string;

  full_name:
    | string
    | null;

  account_number:
    | string
    | null;

  phone:
    | string
    | null;

  email:
    | string
    | null;
};

type Props = {
  members: GoalMemberOption[];
  canManageGoals: boolean;

  fixedMember?:
    | GoalMemberOption
    | null;

  buttonLabel?: string;
};

export default function CreateGoalButton({
  members,
  canManageGoals,
  fixedMember = null,
  buttonLabel = "Create Goal",
}: Props) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    selectedMemberId,
    setSelectedMemberId,
  ] = useState("");

  const [
    memberSearch,
    setMemberSearch,
  ] = useState("");

  const [
    goalName,
    setGoalName,
  ] = useState("");

  const [
    targetAmount,
    setTargetAmount,
  ] = useState("");

  const [
    targetDate,
    setTargetDate,
  ] = useState("");

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

  const filteredMembers =
    useMemo(() => {
      const query =
        memberSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return members;
      }

      return members.filter(
        (member) => {
          const text =
            [
              member.full_name ??
                "",
              member.account_number ??
                "",
              member.phone ??
                "",
              member.email ??
                "",
            ]
              .join(" ")
              .toLowerCase();

          return text.includes(
            query
          );
        }
      );
    }, [
      members,
      memberSearch,
    ]);

  function resetForm() {
    setSelectedMemberId(
      fixedMember?.user_id ??
        ""
    );
    setMemberSearch("");
    setGoalName("");
    setTargetAmount("");
    setTargetDate("");
    setError("");
    setSuccess("");
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setOpen(false);
    resetForm();
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedMemberId) {
      setError(
        "Please select a member."
      );
      return;
    }

    const name =
      goalName.trim();

    if (name.length < 2) {
      setError(
        "Goal name must contain at least 2 characters."
      );
      return;
    }

    const amount =
      Number(
        targetAmount.replaceAll(
          ",",
          ""
        )
      );

    if (
      !Number.isFinite(amount) ||
      amount < 100000
    ) {
      setError(
        "Goal target must be at least 100,000 CFA."
      );
      return;
    }

    setSaving(true);

    try {
      const supabase =
        createClient();

      const {
        data,
        error:
          rpcError,
      } = await supabase.rpc(
        "admin_create_goal",
        {
          p_user_id:
            selectedMemberId,

          p_name:
            name,

          p_target_amount:
            amount,

          p_target_date:
            targetDate ||
            null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error(
          "Goal creation was not completed."
        );
      }

      setSuccess(
        "Goal created successfully."
      );

      router.refresh();

      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create Goal."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canManageGoals) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800"
      >
        <Plus size={18} />

        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-slate-200 p-5 md:p-6">

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  GROW CIG
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Create Goal for Member
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a new savings Goal on behalf of a member.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={22} />
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-5 md:p-6"
            >

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  {success}
                </div>
              )}
              {!fixedMember ? (
                <>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Find Member
                </label>

                <div className="relative mt-2">

                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={
                      memberSearch
                    }
                    onChange={(event) =>
                      setMemberSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search name, account number, phone or email"
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500"
                  />

                </div>
              </div>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Select Member
                </label>

                <select
                  value={
                    selectedMemberId
                  }
                  onChange={(event) =>
                    setSelectedMemberId(
                      event.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select a member
                  </option>

                  {filteredMembers.map(
                    (member) => (
                      <option
                        key={
                          member.user_id
                        }
                        value={
                          member.user_id
                        }
                      >
                        {member.full_name ??
                          "Unnamed Member"}

                        {member.account_number
                          ? ` — ${member.account_number}`
                          : ""}
                      </option>
                    )
                  )}

                </select>

                <p className="mt-2 text-xs font-semibold text-slate-400">
                  {filteredMembers.length} member
                  {filteredMembers.length === 1
                    ? ""
                    : "s"}{" "}
                  available
                </p>
              </div>
                </>
              ) : (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                    Creating Goal For
                  </p>

                  <p className="mt-2 text-base font-black text-slate-950">
                    {fixedMember.full_name ??
                      "Unnamed Member"}
                  </p>

                  {fixedMember.account_number && (
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Account: {fixedMember.account_number}
                    </p>
                  )}

                </div>
              )}

              <div>
                <label className="text-sm font-black text-slate-700">
                  Goal Name
                </label>

                <input
                  type="text"
                  value={
                    goalName
                  }
                  onChange={(event) =>
                    setGoalName(
                      event.target.value
                    )
                  }
                  placeholder="Example: Business Capital"
                  minLength={2}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Target Amount
                </label>

                <input
                  type="number"
                  value={
                    targetAmount
                  }
                  onChange={(event) =>
                    setTargetAmount(
                      event.target.value
                    )
                  }
                  min={100000}
                  step={1000}
                  placeholder="100000"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Minimum target: 100,000 CFA
                </p>
              </div>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Target Date
                </label>

                <input
                  type="date"
                  value={
                    targetDate
                  }
                  onChange={(event) =>
                    setTargetDate(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Optional
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

                <p className="text-sm font-black text-blue-900">
                  New Goal
                </p>

                <p className="mt-2 text-sm font-semibold text-blue-700">
                  Saved: 0 CFA · Locked: 0 CFA · Status: Active
                </p>

              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Goal
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </>
  );
}
