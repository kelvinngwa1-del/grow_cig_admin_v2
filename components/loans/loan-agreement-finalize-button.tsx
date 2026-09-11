"use client";

type Props = {
  finalizeAction: () => Promise<void>;
  isFinalized: boolean;
};

export default function LoanAgreementFinalizeButton({
  finalizeAction,
  isFinalized,
}: Props) {
  if (isFinalized) {
    return (
      <button
        type="button"
        disabled
        className="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700"
      >
        Agreement Finalized
      </button>
    );
  }

  return (
    <form
      action={finalizeAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Finalize this loan agreement?\n\nOnce finalized, this agreement snapshot will be locked and future borrower or document-setting changes will not update it."
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
      >
        Finalize Agreement
      </button>
    </form>
  );
}