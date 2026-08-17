"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  ComponentType,
} from "react";

import Link from "next/link";

import {
  BadgeCheck,
  ChevronRight,
  Clock3,
  FileCheck2,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

type KycRow = {
  id: string;
  user_id: string;

  full_name: string;
  contact_number: string;
  date_of_birth: string;
  place_of_birth: string;
  current_location: string;

  next_of_kin_name: string;
  next_of_kin_number: string;

  id_document_url:
    | string
    | null;

  profile_picture_url:
    | string
    | null;

  status: string;

  rejection_reason:
    | string
    | null;

  submitted_at: string;

  reviewed_at:
    | string
    | null;

  created_at: string;
  updated_at: string;

  reviewed_by_staff:
    | string
    | null;

  account_number:
    | string
    | null;

  member_email:
    | string
    | null;

  member_phone:
    | string
    | null;

  reviewer_name:
    | string
    | null;
};

type Props = {
  kycProfiles: KycRow[];
  staffName: string;
  staffRole: string;
};

function formatDateTime(
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !value
  ) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function pretty(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export default function KycTable({
  kycProfiles,
  staffName,
  staffRole,
}: Props) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const summary =
    useMemo(() => {
      let pending = 0;
      let approved = 0;
      let rejected = 0;

      for (
        const kyc
        of kycProfiles
      ) {
        const status =
          kyc.status
            ?.toLowerCase() ??
          "";

        if (
          status ===
          "pending"
        ) {
          pending += 1;
        }

        if (
          status ===
          "approved"
        ) {
          approved += 1;
        }

        if (
          status ===
          "rejected"
        ) {
          rejected += 1;
        }
      }

      return {
        pending,
        approved,
        rejected,
      };
    }, [
      kycProfiles,
    ]);

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return kycProfiles.filter(
        (kyc) => {
          const status =
            kyc.status
              ?.toLowerCase() ??
            "";

          if (
            statusFilter !==
              "all" &&
            status !==
              statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable =
            [
              kyc.full_name,
              kyc.contact_number,
              kyc.account_number,
              kyc.member_email,
              kyc.member_phone,
              kyc.current_location,
              kyc.place_of_birth,
              kyc.status,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      kycProfiles,
      search,
      statusFilter,
    ]);

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">

        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              GROW CIG Admin
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              KYC Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review and verify member identity applications.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:text-right">

            <p className="text-xs text-slate-400">
              Signed in as
            </p>

            <p className="mt-1 text-sm font-black text-slate-950">
              {staffName}
            </p>

            <p className="mt-1 text-xs font-bold uppercase text-blue-700">
              {staffRole.replaceAll(
                "_",
                " "
              )}
            </p>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-[1600px] p-5 md:p-8">

        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            label="All KYC"
            value={`${kycProfiles.length}`}
            icon={
              ShieldCheck
            }
          />

          <SummaryCard
            label="Pending"
            value={`${summary.pending}`}
            icon={
              Clock3
            }
          />

          <SummaryCard
            label="Approved"
            value={`${summary.approved}`}
            icon={
              BadgeCheck
            }
          />

          <SummaryCard
            label="Rejected"
            value={`${summary.rejected}`}
            icon={
              XCircle
            }
          />

        </section>

        {/* FILTERS */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search member, account, phone, location..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />

            </div>

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
            >

              <option value="all">
                All Statuses
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="rejected">
                Rejected
              </option>

            </select>

          </div>

        </section>

        {/* TABLE */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 px-5 py-4">

            <h2 className="font-black text-slate-950">
              KYC Applications
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Showing{" "}
              {filtered.length}{" "}
              of{" "}
              {kycProfiles.length}
            </p>

          </div>

          {filtered.length ===
          0 ? (
            <div className="p-12 text-center">

              <FileCheck2
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 font-black text-slate-900">
                No KYC Applications Found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                No application matches the current search or filter.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase tracking-wide text-slate-400">

                    <th className="px-5 py-4">
                      Member
                    </th>

                    <th className="px-5 py-4">
                      Contact
                    </th>

                    <th className="px-5 py-4">
                      Location
                    </th>

                    <th className="px-5 py-4">
                      Documents
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Submitted
                    </th>

                    <th className="px-5 py-4">
                      Reviewer
                    </th>

                    <th className="px-5 py-4 text-right">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filtered.map(
                    (kyc) => (
                      <tr
                        key={
                          kyc.id
                        }
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >

                        {/* MEMBER */}

                        <td className="px-5 py-5">

                          <div className="flex min-w-52 items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                              <UserRound
                                size={18}
                              />

                            </div>

                            <div>

                              <Link
                                href={`/members/${kyc.user_id}`}
                                className="font-black text-slate-950 hover:text-blue-700"
                              >
                                {kyc.full_name}
                              </Link>

                              <p className="mt-1 text-xs font-bold text-blue-700">
                                {kyc.account_number ??
                                  "No account number"}
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* CONTACT */}

                        <td className="px-5 py-5">

                          <p className="font-bold text-slate-800">
                            {kyc.contact_number}
                          </p>

                          <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                            {kyc.member_email ??
                              "No email"}
                          </p>

                        </td>

                        {/* LOCATION */}

                        <td className="px-5 py-5">

                          <p className="max-w-48 text-sm font-semibold text-slate-600">
                            {kyc.current_location}
                          </p>

                        </td>

                        {/* DOCUMENTS */}

                        <td className="px-5 py-5">

                          <div className="flex gap-2">

                            <DocumentBadge
                              exists={
                                !!kyc.id_document_url
                              }
                              label="ID"
                            />

                            <DocumentBadge
                              exists={
                                !!kyc.profile_picture_url
                              }
                              label="Photo"
                            />

                          </div>

                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-5">

                          <StatusBadge
                            status={
                              kyc.status
                            }
                          />

                        </td>

                        {/* SUBMITTED */}

                        <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-500">

                          {formatDateTime(
                            kyc.submitted_at
                          )}

                        </td>

                        {/* REVIEWER */}

                        <td className="px-5 py-5 text-sm text-slate-600">

                          {kyc.reviewer_name ??
                            "—"}

                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-5 text-right">

                          <Link
                            href={`/kyc/${kyc.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-800"
                          >
                            Review

                            <ChevronRight
                              size={14}
                            />
                          </Link>

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

    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;

  icon: ComponentType<{
    size?: number;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">

      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between gap-4">

        <p className="text-xl font-black text-slate-950">
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

function DocumentBadge({
  exists,
  label,
}: {
  exists: boolean;
  label: string;
}) {
  return (
    <span
      className={
        exists
          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700"
          : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-400"
      }
    >
      {label}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status
      ?.toLowerCase() ??
    "";

  let style =
    "bg-slate-100 text-slate-600";

  if (
    normalized ===
    "pending"
  ) {
    style =
      "bg-amber-50 text-amber-700";
  } else if (
    normalized ===
    "approved"
  ) {
    style =
      "bg-emerald-50 text-emerald-700";
  } else if (
    normalized ===
    "rejected"
  ) {
    style =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${style}`}
    >
      {pretty(
        status || "unknown"
      )}
    </span>
  );
}