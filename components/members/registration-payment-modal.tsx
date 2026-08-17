"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  CircleDollarSign,
  Loader2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Props = {
  memberId: string;
  memberName: string;

  registrationFeeDue:
    | number
    | string
    | null;

  registrationFeePaid:
    | number
    | string
    | null;

  onClose: () => void;

  onSuccess?: () => void;
};

function numberValue(
  value:
    | number
    | string
    | null
    | undefined
) {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatCfa(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 0,
    }
  ).format(value);
}

export default function RegistrationPaymentModal({
  memberId,
  memberName,
  registrationFeeDue,
  registrationFeePaid,
  onClose,
  onSuccess,
}: Props) {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const feeDue =
    numberValue(
      registrationFeeDue
    );

  const feePaid =
    numberValue(
      registrationFeePaid
    );

  const remaining =
    Math.max(
      feeDue - feePaid,
      0
    );

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("cash");

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  async function submitPayment() {
    setError("");
    setSuccess("");

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid payment amount."
      );
      return;
    }

    if (
      numericAmount >
      remaining
    ) {
      setError(
        `Payment cannot exceed the remaining ${formatCfa(
          remaining
        )} CFA.`
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Record ${formatCfa(
          numericAmount
        )} CFA registration payment for ${memberName}?`
      );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      const {
        data,
        error:
          rpcError,
      } =
        await supabase.rpc(
          "admin_record_registration_payment",
          {
            p_user_id:
              memberId,

            p_amount:
              numericAmount,

            p_payment_method:
              paymentMethod,

            p_reference:
              reference.trim() ||
              null,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      const result =
        data as {
          remaining?: number;
        } | null;

      const newRemaining =
        numberValue(
          result?.remaining
        );

      setSuccess(
        `Registration payment recorded successfully. Remaining: ${formatCfa(
          newRemaining
        )} CFA.`
      );

      setAmount("");
      setReference("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (
      caughtError
    ) {
      const message =
        caughtError instanceof
        Error
          ? caughtError.message
          : typeof caughtError ===
              "object" &&
            caughtError !== null &&
            "message" in
              caughtError
          ? String(
              (
                caughtError as {
                  message?: unknown;
                }
              ).message
            )
          : "Unable to record registration payment.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">

        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <CircleDollarSign className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Add Registration Payment
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {memberName}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        <div className="space-y-6 p-6">

          <div className="grid gap-3 sm:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fee Due
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatCfa(
                  feeDue
                )} CFA
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Already Paid
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatCfa(
                  feePaid
                )} CFA
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                Remaining
              </p>

              <p className="mt-2 text-lg font-bold text-blue-800">
                {formatCfa(
                  remaining
                )} CFA
              </p>
            </div>

          </div>

          {remaining <= 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              Registration fee is fully paid.
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Amount Paid
                </label>

                <input
                  type="number"
                  min="1"
                  max={remaining}
                  step="1"
                  value={amount}
                  onChange={(
                    event
                  ) =>
                    setAmount(
                      event.target
                        .value
                    )
                  }
                  placeholder="Enter amount"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Payment Method
                </label>

                <select
                  value={
                    paymentMethod
                  }
                  onChange={(
                    event
                  ) =>
                    setPaymentMethod(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="cash">
                    Cash
                  </option>

                  <option value="mtn_momo">
                    MTN MoMo
                  </option>

                  <option value="orange_money">
                    Orange Money
                  </option>

                  <option value="bank_transfer">
                    Bank Transfer
                  </option>

                  <option value="pos">
                    POS
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Receipt / Reference
                </label>

                <input
                  type="text"
                  value={
                    reference
                  }
                  onChange={(
                    event
                  ) =>
                    setReference(
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Leave blank and the system will generate a reference automatically.
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
            </div>
          )}

        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>

          {remaining > 0 && (
            <button
              type="button"
              onClick={
                submitPayment
              }
              disabled={
                submitting
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CircleDollarSign className="h-4 w-4" />
                  Record Payment
                </>
              )}
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
