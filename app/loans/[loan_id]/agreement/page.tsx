import type {
  ReactNode,
} from "react";

import { revalidatePath } from "next/cache";

import {
  notFound,
  redirect,
} from "next/navigation";

import LoanAgreementFinalizeButton from "@/components/loans/loan-agreement-finalize-button";
import LoanAgreementPrintButton from "@/components/loans/loan-agreement-print-button";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    loan_id: string;
  }>;
};

type AnyRow = Record<string, any>;

function money(
  value:
    | number
    | string
    | null
    | undefined
) {
  const amount =
    Number(value ?? 0);

  if (Number.isNaN(amount)) {
    return "0 CFA";
  }

  return `${amount.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2,
    }
  )} CFA`;
}

function text(
  value:
    | string
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "N/A";
  }

  return String(value);
}

function pretty(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "N/A";
  }

  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "N/A";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return parsed.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function isWebUrl(
  value:
    | string
    | null
    | undefined
) {
  return (
    value?.startsWith("http://") ||
    value?.startsWith("https://")
  );
}

export default async function LoanAgreementPage({
  params,
}: Props) {
  const { loan_id } =
    await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const {
    data: staff,
  } = await supabase
    .from("staff_users")
    .select(
      "id, full_name, role, is_active"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    !staff ||
    !staff.is_active
  ) {
    redirect("/");
  }

  const {
    data:
      hasLoanPermission,
  } = await supabase.rpc(
    "staff_has_permission",
    {
      p_permission_key:
        "loans.manage",
    }
  );

  if (
    hasLoanPermission !== true
  ) {
    redirect("/loans");
  }

  const {
    data: liveLoan,
    error: loanError,
  } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loan_id)
    .maybeSingle();

  if (
    loanError ||
    !liveLoan
  ) {
    notFound();
  }

  const {
    data: agreementRows,
    error: agreementError,
  } = await supabase.rpc(
    "get_or_create_loan_agreement_snapshot",
    {
      p_loan_id:
        loan_id,
    }
  );

  if (agreementError) {
    throw new Error(
      agreementError.message
    );
  }

  const agreementRecord: AnyRow =
    agreementRows?.[0] ?? {};

  const isFinalized =
    Boolean(
      agreementRecord
        .agreement_finalized_at
    );

  const agreementSnapshot: AnyRow =
    agreementRecord
      .agreement_snapshot ??
    {};

  const loan: AnyRow =
    agreementSnapshot.loan ??
    liveLoan;

  const member: AnyRow =
    agreementSnapshot.member ??
    {};

  const kyc: AnyRow =
    agreementSnapshot.kyc ??
    {};

  const repayments: AnyRow[] =
    Array.isArray(
      agreementSnapshot.repayments
    )
      ? agreementSnapshot.repayments
      : [];

  const documentSettings: AnyRow =
    agreementSnapshot
      .document_settings ??
    {};

  async function secureUrl(
    bucket: string,
    path:
      | string
      | null
      | undefined
  ) {
    if (!path) {
      return "";
    }

    if (isWebUrl(path)) {
      return path;
    }

    const {
      data,
      error,
    } =
      await supabase.storage
        .from(bucket)
        .createSignedUrl(
          path,
          60 * 60
        );

    if (error) {
      console.error(
        `Unable to load ${bucket} file:`,
        error
      );

      return "";
    }

    return (
      data?.signedUrl ??
      ""
    );
  }

  const [
    logoUrl,
    signatureUrl,
    stampUrl,
    borrowerPhotoUrl,
  ] = await Promise.all([
    secureUrl(
      "document-assets",
      documentSettings
        ?.logo_url
    ),

    secureUrl(
      "document-assets",
      documentSettings
        ?.ceo_signature_url
    ),

    secureUrl(
      "document-assets",
      documentSettings
        ?.official_stamp_url
    ),

    secureUrl(
      "profile-pictures",
      kyc
        .profile_picture_url
    ),
  ]);

  const borrowerName =
    kyc.full_name ||
    member.full_name ||
    "Member";

  const borrowerPhone =
    kyc.contact_number ||
    member.phone ||
    member.contact_number ||
    "";

  const accountNumber =
    member.account_number ||
    member.membership_number ||
    "";

  const year =
    new Date(
      loan.created_at ??
        Date.now()
    ).getFullYear();

  const shortLoanId =
    String(loan.id)
      .replaceAll("-", "")
      .slice(0, 10)
      .toUpperCase();

  const agreementNumber =
    agreementRecord
      .agreement_number ||
    `GROW-LA-${year}-${shortLoanId}`;

  const organizationName =
    documentSettings
      ?.organization_name ||
    "GROW COMMON INITIATIVE GROUP";

  const ceoName =
    documentSettings
      ?.ceo_full_name ||
    "Kelvin Ngwa";

  const ceoTitle =
    documentSettings
      ?.ceo_title ||
    "Founder & CEO";

  const interestRate =
    Number(
      loan.monthly_interest_rate ??
        0
    ) * 100;

  const duration =
    Number(
      loan.duration_months ??
        0
    );

  const repaymentRows =
    repayments;

  async function finalizeAgreementAction() {
    "use server";

    const actionSupabase =
      await createClient();

    const {
      error,
    } = await actionSupabase.rpc(
      "finalize_loan_agreement",
      {
        p_loan_id:
          loan_id,
      }
    );

    if (error) {
      throw new Error(
        error.message
      );
    }

    revalidatePath(
      `/loans/${loan_id}/agreement`
    );
  }

  return (
    <>
      <style>
  {`
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }

      html,
      body {
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }

      body * {
        visibility: hidden !important;
      }

      .loan-agreement-paper,
      .loan-agreement-paper * {
        visibility: visible !important;
      }

      .loan-agreement-paper {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        box-sizing: border-box !important;
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 11mm 12mm 9mm !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: white !important;
        color: #0f172a !important;
        overflow: hidden !important;
        font-size: 11px !important;
        line-height: 1.32 !important;
      }

      .screen-only {
        display: none !important;
      }

      .agreement-content {
        box-sizing: border-box !important;
        width: 100% !important;
        height: 100% !important;
        padding: 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }

      .agreement-main {
        min-height: 0 !important;
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
      }

      .letterhead {
        padding-bottom: 9px !important;
      }

      .brand-logo {
        width: 66px !important;
        height: 66px !important;
        object-fit: contain !important;
        transform: scale(1.28);
        transform-origin: center;
      }

      .brand-name {
        font-size: 20px !important;
        line-height: 1.08 !important;
      }

      .agreement-title {
        margin-top: 16px !important;
        margin-bottom: 15px !important;
      }

      .agreement-title h2 {
        font-size: 16px !important;
        line-height: 1.15 !important;
      }

      .intro {
        margin-bottom: 13px !important;
        font-size: 10.7px !important;
        line-height: 1.42 !important;
      }

      .section {
        margin-top: 12px !important;
      }

      .section-heading {
        margin-bottom: 7px !important;
        padding-bottom: 4px !important;
        font-size: 11px !important;
      }

      .borrower-grid {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 110px !important;
        column-gap: 24px !important;
        row-gap: 8px !important;
      }

      .info-label {
        font-size: 8px !important;
        line-height: 1.15 !important;
      }

      .info-value {
        margin-top: 2px !important;
        font-size: 10.6px !important;
        line-height: 1.2 !important;
      }

      .borrower-photo {
        width: 98px !important;
        height: 118px !important;
      }

      .loan-table {
        width: 100% !important;
      }

      .loan-table th,
      .loan-table td {
        padding: 5.5px 8px !important;
        font-size: 9.7px !important;
        line-height: 1.22 !important;
      }

      .repayment-box {
        padding: 9px 11px !important;
        font-size: 9.7px !important;
        line-height: 1.25 !important;
      }

      .terms {
        margin-top: 1px !important;
      }

      .terms p {
        margin: 0 0 6px 0 !important;
        font-size: 13.5px !important;
        line-height: 1.38 !important;
      }

      .signatures {
        margin-top: auto !important;
        padding-top: 20px !important;
        gap: 34px !important;
      }

      .signature-space {
        height: 42px !important;
      }

      .signature-image {
        max-height: 40px !important;
        max-width: 145px !important;
        object-fit: contain !important;
      }

      .agreement-footer {
        flex: 0 0 auto !important;
        margin-top: 12px !important;
        padding-top: 7px !important;
        font-size: 8px !important;
        line-height: 1.25 !important;
      }

      section,
      table,
      footer,
      .signatures {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  `}
</style>

      <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8 print:p-0 print:bg-white">

        <div className="mx-auto max-w-5xl">

          <div className="screen-only mb-4 flex items-center justify-end gap-3">

            <LoanAgreementFinalizeButton
              finalizeAction={
                finalizeAgreementAction
              }
              isFinalized={
                isFinalized
              }
            />

            <LoanAgreementPrintButton />

          </div>

          <article className="loan-agreement-paper rounded-3xl border border-slate-200 bg-white shadow-sm">

            <div className="agreement-content px-10 py-10 print:p-0">

              <div className="agreement-main">

                {/* LETTERHEAD */}

                <header className="letterhead border-b-2 border-blue-700 pb-5">

                  <div className="flex items-start justify-between gap-8">

                    <div className="flex min-w-0 items-center gap-5">

                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="GROW logo"
                          className="brand-logo h-20 w-20 shrink-0 object-contain"
                        />
                      ) : null}

                      <div className="min-w-0">

                        <h1 className="brand-name text-2xl font-black tracking-tight text-slate-950">
                          {organizationName}
                        </h1>

                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {text(
                            documentSettings
                              ?.office_address
                          )}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">

                          <span>
                            Tel:{" "}
                            {text(
                              documentSettings
                                ?.phone
                            )}
                          </span>

                          <span>
                            Email:{" "}
                            {text(
                              documentSettings
                                ?.email
                            )}
                          </span>

                          <span>
                            {text(
                              documentSettings
                                ?.website
                            )}
                          </span>

                        </div>

                      </div>

                    </div>

                    <div className="shrink-0 text-right text-xs text-slate-600">

                      <p className="font-bold uppercase tracking-wide text-slate-400">
                        Agreement No.
                      </p>

                      <p className="mt-1 font-black text-slate-950">
                        {agreementNumber}
                      </p>

                      <p className="mt-3">
                        Status:{" "}
                        <strong>
                          {pretty(
                            loan.status
                          )}
                        </strong>
                      </p>

                    </div>

                  </div>

                </header>

                {/* TITLE */}

                <section className="agreement-title text-center">

                  <h2 className="text-lg font-black uppercase tracking-[0.24em] text-slate-950">
                    Loan Agreement
                  </h2>

                  <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-blue-700" />

                </section>

                {/* INTRO */}

                <p className="intro text-sm leading-6 text-slate-700">
                  This agreement is made between{" "}
                  <strong className="text-slate-950">
                    {organizationName}
                  </strong>{" "}
                  and the borrower named below. The borrower confirms that the information provided is correct and agrees to repay the loan according to the approved conditions and repayment schedule.
                </p>

                {/* BORROWER DETAILS */}

                <section className="section">

                  <SectionTitle>
                    Borrower Details
                  </SectionTitle>

                  <div className="borrower-grid grid grid-cols-[1fr_1fr_125px] gap-x-10 gap-y-4">

                    <Info
                      label="Full Name"
                      value={
                        borrowerName
                      }
                    />

                    <Info
                      label="Account Number"
                      value={
                        accountNumber
                      }
                    />

                    <div className="row-span-4">

                      <p className="info-label mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Borrower Photo
                      </p>

                      <div className="borrower-photo h-36 w-full overflow-hidden border border-slate-300 bg-slate-50">

                        {borrowerPhotoUrl ? (
                          <img
                            src={
                              borrowerPhotoUrl
                            }
                            alt={
                              borrowerName
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-400">
                            No photograph
                          </div>
                        )}

                      </div>

                    </div>

                    <Info
                      label="Contact Number"
                      value={
                        borrowerPhone
                      }
                    />

                    <Info
                      label="Date of Birth"
                      value={formatDate(
                        kyc.date_of_birth
                      )}
                    />

                    <Info
                      label="Place of Birth"
                      value={
                        kyc.place_of_birth
                      }
                    />

                    <Info
                      label="Current Location"
                      value={
                        kyc.current_location
                      }
                    />

                    <Info
                      label="Next of Kin"
                      value={
                        kyc.next_of_kin_name
                      }
                    />

                    <Info
                      label="Next of Kin Contact"
                      value={
                        kyc.next_of_kin_number
                      }
                    />

                  </div>

                </section>

                {/* LOAN TERMS */}

                <section className="section">

                  <SectionTitle>
                    Loan Terms
                  </SectionTitle>

                  <div className="overflow-hidden border border-slate-300">

                    <table className="loan-table w-full border-collapse text-sm">

                      <tbody>

                        <LoanRow
                          label1="Principal Amount"
                          value1={money(
                            loan.principal
                          )}
                          label2="Duration"
                          value2={`${duration} month${
                            duration === 1
                              ? ""
                              : "s"
                          }`}
                        />

                        <LoanRow
                          label1="Monthly Interest Rate"
                          value1={`${interestRate}%`}
                          label2="Total Interest"
                          value2={money(
                            loan.total_interest
                          )}
                        />

                        <LoanRow
                          label1="Total Repayment"
                          value1={money(
                            loan.total_repayment
                          )}
                          label2="Required Savings"
                          value2={money(
                            loan.required_savings
                          )}
                        />

                        <LoanRow
                          label1="Security Locked"
                          value1={money(
                            loan.security_locked
                          )}
                          label2="Application Date"
                          value2={formatDate(
                            loan.created_at
                          )}
                        />

                        <LoanRow
                          label1="Approval Date"
                          value1={formatDate(
                            loan.approved_at
                          )}
                          label2="Disbursement Date"
                          value2={formatDate(
                            loan.disbursed_at
                          )}
                        />

                      </tbody>

                    </table>

                  </div>

                </section>

                {/* REPAYMENT */}

                <section className="section">

                  <SectionTitle>
                    Repayment Schedule
                  </SectionTitle>

                  {repaymentRows.length >
                  0 ? (
                    <div className="overflow-hidden border border-slate-300">

                      <table className="loan-table w-full border-collapse text-left text-xs">

                        <thead className="bg-slate-100">

                          <tr>
                            <th className="border-b border-slate-300">
                              #
                            </th>

                            <th className="border-b border-slate-300">
                              Due Date
                            </th>

                            <th className="border-b border-slate-300">
                              Amount Due
                            </th>

                            <th className="border-b border-slate-300">
                              Amount Paid
                            </th>

                            <th className="border-b border-slate-300">
                              Status
                            </th>
                          </tr>

                        </thead>

                        <tbody>

                          {repaymentRows.map(
                            (
                              repayment:
                                AnyRow,
                              index
                            ) => (
                              <tr
                                key={
                                  repayment.id ??
                                  index
                                }
                              >
                                <td className="border-b border-slate-200">
                                  {repayment.installment_number ??
                                    index +
                                      1}
                                </td>

                                <td className="border-b border-slate-200">
                                  {formatDate(
                                    repayment.due_date ??
                                      repayment.repayment_date
                                  )}
                                </td>

                                <td className="border-b border-slate-200 font-semibold">
                                  {money(
                                    repayment.amount_due
                                  )}
                                </td>

                                <td className="border-b border-slate-200">
                                  {money(
                                    repayment.amount_paid ??
                                      repayment.amount
                                  )}
                                </td>

                                <td className="border-b border-slate-200">
                                  {pretty(
                                    repayment.status
                                  )}
                                </td>
                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>
                  ) : (
                    <div className="repayment-box border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      Repayment schedule has not yet been generated for this loan.
                    </div>
                  )}

                </section>

                {/* TERMS */}

                <section className="section">

                  <SectionTitle>
                    Terms and Conditions
                  </SectionTitle>

                  <div className="terms text-sm leading-6 text-slate-700">

                    <p>
                      <strong>1.</strong>{" "}
                      The borrower agrees to repay the total amount due according to the repayment schedule applicable to this loan.
                    </p>

                    <p>
                      <strong>2.</strong>{" "}
                      Any savings locked as loan security remain subject to GROW CIG loan policies until the borrower has satisfied the applicable repayment obligations.
                    </p>

                    <p>
                      <strong>3.</strong>{" "}
                      Late or overdue repayments may attract additional charges according to the loan policy applicable at the time of this agreement.
                    </p>

                    <p>
                      <strong>4.</strong>{" "}
                      The borrower confirms that all personal and KYC information supplied to GROW CIG is correct.
                    </p>

                    <p>
                      <strong>5.</strong>{" "}
                      This agreement shall be read together with GROW CIG&apos;s applicable loan policies and conditions.
                    </p>

                  </div>

                </section>

                {/* SIGNATURES */}

                <section className="signatures grid grid-cols-2 gap-12">

                  <div>

                    <div className="signature-space h-16" />

                    <div className="border-t border-slate-900 pt-2">

                      <p className="font-bold text-slate-950">
                        {borrowerName}
                      </p>

                      <p className="text-xs text-slate-500">
                        Borrower
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Signature: ____________________
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Date: ____________________
                      </p>

                    </div>

                  </div>

                  <div className="relative pt-16">

                    <div className="pointer-events-none absolute inset-0 z-20">

                      {signatureUrl ? (
                        <img
                          src={signatureUrl}
                          alt="CEO Signature"
                          className="absolute left-[45px] top-[65px] z-20 max-h-[55px] max-w-[150px] object-contain"
                        />
                      ) : (
                        <span className="absolute left-[35px] top-[45px] text-xs text-slate-400">
                          Authorized signature
                        </span>
                      )}

                      {stampUrl ? (
                        <img
                          src={stampUrl}
                          alt="Official Stamp"
                          className="absolute left-[115px] top-[50px] z-30 h-[82px] w-[82px] object-contain opacity-90"
                        />
                      ) : null}

                    </div>

                    <div className="relative z-10 border-t border-slate-900 pt-2">

                      <p className="font-bold text-slate-950">
                        {ceoName}
                      </p>

                      <p className="text-xs text-slate-500">
                        {ceoTitle}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        For{" "}
                        {organizationName}
                      </p>

                    </div>

                  </div>

                </section>

              </div>

              {/* FOOTER */}

              <footer className="agreement-footer border-t border-slate-200 text-center text-[10px] text-slate-400">

                <p>
                  {documentSettings
                    ?.agreement_footer_text ||
                    "This document is generated by GROW CIG and remains subject to the organization's applicable policies and terms."}
                </p>

                <p className="mt-1 font-bold text-slate-500">
                  Agreement No.{" "}
                  {agreementNumber}
                </p>

              </footer>

            </div>

          </article>

        </div>

      </main>
    </>
  );
}

function SectionTitle({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="section-heading border-b border-slate-300 pb-2">
      <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-950">
        {children}
      </h3>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div>
      <p className="info-label text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="info-value mt-1 break-words text-sm font-semibold text-slate-800">
        {text(value)}
      </p>
    </div>
  );
}

function LoanRow({
  label1,
  value1,
  label2,
  value2,
}: {
  label1: string;
  value1: string;
  label2: string;
  value2: string;
}) {
  return (
    <tr>

      <th className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label1}
      </th>

      <td className="border-b border-r border-slate-200 px-4 py-3 font-bold text-slate-900">
        {value1}
      </td>

      <th className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label2}
      </th>

      <td className="border-b border-slate-200 px-4 py-3 font-bold text-slate-900">
        {value2}
      </td>

    </tr>
  );
}