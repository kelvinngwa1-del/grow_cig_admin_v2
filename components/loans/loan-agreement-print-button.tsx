"use client";

import {
  ArrowLeft,
  Download,
  Printer,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function LoanAgreementPrintButton() {
  const router = useRouter();

  function printAgreement() {
    window.print();
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <ArrowLeft size={17} />
        Back to Loan
      </button>

      <div className="flex flex-wrap gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 sm:flex">
          <Download size={15} />
          Choose “Save as PDF” in print dialog
        </div>

        <button
          type="button"
          onClick={printAgreement}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
        >
          <Printer size={17} />
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}