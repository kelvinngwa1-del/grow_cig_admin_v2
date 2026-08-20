"use client";

import { useEffect, useMemo, useState } from "react";

import type { LucideIcon } from "lucide-react";

import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type AnyRecord = Record<string, unknown>;

type Props = {
  details?: unknown;
  data?: unknown;

  staffRole?: string;
  canManage?: boolean;
  canProcess?: boolean;

  [key: string]: unknown;
};

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = textValue(value).trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function isWebUrl(value: unknown) {
  const url = textValue(value).trim().toLowerCase();

  return url.startsWith("http://") || url.startsWith("https://");
}

function formatDate(value: unknown) {
  const raw = textValue(value);

  if (!raw) {
    return "Ã¢â‚¬â€";
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: unknown) {
  const raw = textValue(value);

  if (!raw) {
    return "Ã¢â‚¬â€";
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyStatus(value: unknown) {
  const status = textValue(value).trim().toLowerCase();

  if (!status) {
    return "Pending";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function KycDetails(props: Props) {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  // ============================================================
  // NORMALIZE DATA
  // ============================================================

  const source = isRecord(props.details)
    ? props.details
    : isRecord(props.data)
      ? props.data
      : props;

  const kyc = isRecord(source.kyc) ? source.kyc : source;

  const member = isRecord(source.member) ? source.member : {};

  const reviewer = isRecord(source.reviewer) ? source.reviewer : {};

  const kycId = firstText(kyc.id, props.kycId, props.kyc_id);

  const status = firstText(kyc.status, "pending").toLowerCase();

  const fullName = firstText(kyc.full_name, member.full_name, "Unknown Member");

  const accountNumber = firstText(
    member.account_number,
    member.membership_number,
  );

  const email = firstText(member.email);

  const memberPhone = firstText(member.phone, member.contact_number);

  const contactNumber = firstText(kyc.contact_number, memberPhone);

  const profilePicturePath = firstText(kyc.profile_picture_url);

  const idDocumentPath = firstText(kyc.id_document_url);

  const [profilePictureUrl, setProfilePictureUrl] = useState("");

  const [idDocumentUrl, setIdDocumentUrl] = useState("");

  // ============================================================
  // KYC MANAGEMENT PERMISSION
  //
  // Viewing is protected separately by kyc.view.
  // Approve / Reject actions require kyc.manage.
  // ============================================================

  const [hasManagePermission, setHasManagePermission] = useState(false);

  const [loadingPermission, setLoadingPermission] = useState(true);

  const canProcess =
    hasManagePermission &&
    props.canProcess !== false &&
    props.canManage !== false;

  // ============================================================
  // STATE
  // ============================================================

  const [processing, setProcessing] = useState<"approve" | "reject" | null>(
    null,
  );

  const [showReject, setShowReject] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // ============================================================
  // LOAD KYC MANAGEMENT PERMISSION
  // ============================================================

  // ============================================================
  // LOAD PRIVATE KYC FILES WITH TEMPORARY SIGNED URLS
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function createSecureUrl(bucket: string, path: string) {
      if (!path) {
        return "";
      }

      // Keep compatibility with any older records
      // that already contain a complete URL.
      if (isWebUrl(path)) {
        return path;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 600);

      if (error) {
        console.error(`Unable to load ${bucket} KYC file:`, error);

        return "";
      }

      return data?.signedUrl ?? "";
    }

    async function loadKycFiles() {
      const [profileUrl, documentUrl] = await Promise.all([
        createSecureUrl("profile-pictures", profilePicturePath),

        createSecureUrl("kyc-documents", idDocumentPath),
      ]);

      if (!mounted) {
        return;
      }

      setProfilePictureUrl(profileUrl);

      setIdDocumentUrl(documentUrl);
    }

    void loadKycFiles();

    return () => {
      mounted = false;
    };
  }, [supabase, profilePicturePath, idDocumentPath]);
  useEffect(() => {
    let mounted = true;

    async function loadKycPermission() {
      setLoadingPermission(true);

      const { data, error: permissionError } = await supabase.rpc(
        "staff_has_permission",
        {
          p_permission_key: "kyc.manage",
        },
      );

      if (!mounted) {
        return;
      }

      if (permissionError) {
        console.error("KYC PERMISSION ERROR:", permissionError);

        setHasManagePermission(false);

        setLoadingPermission(false);

        return;
      }

      setHasManagePermission(data === true);

      setLoadingPermission(false);
    }

    void loadKycPermission();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  // ============================================================
  // APPROVE
  // ============================================================

  async function approve() {
    if (loadingPermission) {
      setError("KYC permissions are still loading.");

      return;
    }

    if (!canProcess) {
      setError("You do not have permission to approve or reject KYC.");

      return;
    }

    if (!kycId) {
      setError("KYC record ID is missing.");

      return;
    }

    if (processing !== null) {
      return;
    }

    const confirmed = window.confirm(`Approve KYC for ${fullName}?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setProcessing("approve");

    try {
      const { error: rpcError } = await supabase.rpc("admin_process_kyc", {
        p_kyc_id: kycId,

        p_action: "approve",

        p_rejection_reason: null,
      });

      if (rpcError) {
        throw rpcError;
      }

      setSuccess("KYC approved successfully.");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve KYC.");
    } finally {
      setProcessing(null);
    }
  }

  // ============================================================
  // REJECT
  // ============================================================

  async function reject() {
    if (loadingPermission) {
      setError("KYC permissions are still loading.");

      return;
    }

    if (!canProcess) {
      setError("You do not have permission to approve or reject KYC.");

      return;
    }

    if (!kycId) {
      setError("KYC record ID is missing.");

      return;
    }

    const reason = rejectionReason.trim();

    if (reason.length < 3) {
      setError("Enter a rejection reason.");

      return;
    }

    if (processing !== null) {
      return;
    }

    setError("");
    setSuccess("");
    setProcessing("reject");

    try {
      const { error: rpcError } = await supabase.rpc("admin_process_kyc", {
        p_kyc_id: kycId,

        p_action: "reject",

        p_rejection_reason: reason,
      });

      if (rpcError) {
        throw rpcError;
      }

      setShowReject(false);

      setRejectionReason("");

      setSuccess("KYC rejected successfully.");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject KYC.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              GROW CIG Admin
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              KYC Review
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review member identity and verification information.
            </p>
          </div>

          <StatusBadge status={status} />
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] p-5 md:p-8">
        {/* ====================================================
            MEMBER HEADER
        ==================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-blue-700">
              {isWebUrl(profilePictureUrl) ? (
                <img
                  src={profilePictureUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound size={34} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black text-slate-950">{fullName}</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {accountNumber && (
                  <SmallBadge icon={IdCard} text={accountNumber} />
                )}

                {contactNumber && (
                  <SmallBadge icon={Phone} text={contactNumber} />
                )}

                {email && <SmallBadge icon={Mail} text={email} />}
              </div>
            </div>
          </div>
        </section>

        {/* MESSAGES */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        )}

        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <User size={20} />
              </div>

              <div>
                <h2 className="font-black text-slate-950">
                  Personal Information
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Information submitted by the member.
                </p>
              </div>
            </div>

            <div className="mt-6 divide-y divide-slate-100">
              <InfoRow label="Full Name" value={fullName} />

              <InfoRow
                label="Contact Number"
                value={contactNumber || "Ã¢â‚¬â€"}
              />

              <InfoRow
                label="Date of Birth"
                value={formatDate(kyc.date_of_birth)}
              />

              <InfoRow
                label="Place of Birth"
                value={firstText(kyc.place_of_birth) || "Ã¢â‚¬â€"}
              />

              <InfoRow
                label="Current Location"
                value={firstText(kyc.current_location) || "Ã¢â‚¬â€"}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <Users size={20} />
              </div>

              <div>
                <h2 className="font-black text-slate-950">Next of Kin</h2>

                <p className="mt-1 text-xs text-slate-500">
                  Emergency contact information.
                </p>
              </div>
            </div>

            <div className="mt-6 divide-y divide-slate-100">
              <InfoRow
                label="Next of Kin Name"
                value={firstText(kyc.next_of_kin_name) || "Ã¢â‚¬â€"}
              />

              <InfoRow
                label="Next of Kin Number"
                value={firstText(kyc.next_of_kin_number) || "Ã¢â‚¬â€"}
              />

              <InfoRow
                label="Submitted"
                value={formatDateTime(kyc.submitted_at)}
              />

              <InfoRow
                label="Last Updated"
                value={formatDateTime(kyc.updated_at)}
              />
            </div>
          </div>
        </section>

        {/* ====================================================
            DOCUMENTS
        ==================================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="font-black text-slate-950">
                Verification Documents
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Review uploaded identity documents and profile picture.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <DocumentCard
              title="Profile Picture"
              url={profilePictureUrl}
              icon={UserRound}
              image
            />

            <DocumentCard
              title="Identity Document"
              url={idDocumentUrl}
              icon={IdCard}
            />
          </div>
        </section>

        {/* ====================================================
            REVIEW INFORMATION
        ==================================================== */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h2 className="font-black text-slate-950">Review Status</h2>

              <p className="mt-1 text-xs text-slate-500">
                Current verification decision and reviewer information.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ReviewCard
              icon={BadgeCheck}
              label="Status"
              value={prettyStatus(status)}
            />

            <ReviewCard
              icon={UserRound}
              label="Reviewed By"
              value={
                firstText(reviewer.full_name, reviewer.name) || "Not reviewed"
              }
            />

            <ReviewCard
              icon={CalendarDays}
              label="Reviewed At"
              value={formatDateTime(kyc.reviewed_at)}
            />
          </div>

          {firstText(kyc.rejection_reason) && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-red-600">
                Rejection Reason
              </p>

              <p className="mt-2 text-sm leading-6 text-red-800">
                {firstText(kyc.rejection_reason)}
              </p>
            </div>
          )}
        </section>

        {/* ====================================================
            ADMIN ACTIONS
        ==================================================== */}

        {status === "pending" && loadingPermission && (
          <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center gap-3 text-sm font-semibold text-blue-700">
              <Loader2 size={18} className="animate-spin" />
              Checking KYC management permission...
            </div>
          </section>
        )}

        {status === "pending" && !loadingPermission && !canProcess && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div>
                <h2 className="font-black text-slate-950">
                  View-Only KYC Access
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  You can review this KYC record, but your account does not have
                  the kyc.manage duty required to approve or reject it.
                </p>
              </div>
            </div>
          </section>
        )}

        {status === "pending" && !loadingPermission && canProcess && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="font-black text-slate-950">KYC Decision</h2>

            <p className="mt-1 text-sm text-slate-500">
              Approve the member after verifying the information, or reject with
              a reason.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={processing !== null}
                onClick={approve}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {processing === "approve" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Approve KYC
              </button>

              <button
                type="button"
                disabled={processing !== null}
                onClick={() => {
                  setError("");

                  setShowReject(!showReject);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-3 font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <XCircle size={18} />
                Reject KYC
              </button>
            </div>

            {showReject && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
                <label className="text-sm font-black text-red-900">
                  Rejection Reason
                </label>

                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explain why this KYC application is being rejected..."
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={processing !== null}
                    onClick={() => {
                      setShowReject(false);

                      setRejectionReason("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={processing !== null}
                    onClick={reject}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    {processing === "reject" && (
                      <Loader2 size={17} className="animate-spin" />
                    )}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

// ================================================================
// DOCUMENT CARD
// ================================================================

function DocumentCard({
  title,
  url,
  icon: Icon,
  image = false,
}: {
  title: string;

  url: string;

  icon: LucideIcon;

  image?: boolean;
}) {
  const webUrl = isWebUrl(url);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      {image && webUrl ? (
        <div className="h-56 bg-slate-100">
          <img src={url} alt={title} className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center bg-slate-50 text-slate-300">
          <Icon size={40} />
        </div>
      )}

      <div className="p-4">
        <p className="font-black text-slate-900">{title}</p>

        {url ? (
          webUrl ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-100"
            >
              <ExternalLink size={15} />
              Open Document
            </a>
          ) : (
            <div className="mt-3 rounded-xl bg-amber-50 p-3">
              <p className="text-xs font-semibold leading-5 text-amber-700">
                A document path exists, but it is not a public web URL.
              </p>
            </div>
          )
        ) : (
          <p className="mt-2 text-sm text-slate-400">No document uploaded.</p>
        )}
      </div>
    </div>
  );
}

// ================================================================
// INFO ROW
// ================================================================

function InfoRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>

      <p className="break-words text-sm font-black text-slate-900 sm:text-right">
        {value}
      </p>
    </div>
  );
}

// ================================================================
// SMALL BADGE
// ================================================================

function SmallBadge({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;

  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
      <Icon size={14} />

      {text}
    </span>
  );
}

// ================================================================
// REVIEW CARD
// ================================================================

function ReviewCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;

  label: string;

  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <Icon size={18} className="text-blue-700" />

      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}

// ================================================================
// STATUS
// ================================================================

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let style = "bg-slate-100 text-slate-700";

  if (normalized === "pending") {
    style = "bg-amber-50 text-amber-700";
  }

  if (normalized === "approved") {
    style = "bg-emerald-50 text-emerald-700";
  }

  if (normalized === "rejected") {
    style = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-xs font-black ${style}`}
    >
      {prettyStatus(normalized)}
    </span>
  );
}
