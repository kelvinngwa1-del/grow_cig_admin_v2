"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  MessageSquareReply,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type TicketStatus = "open" | "under_review" | "resolved";

type SupportTicket = {
  id: string;
  user_id: string;
  ticket_number: string | null;
  category: string | null;
  subject: string;
  message: string;
  status: string | null;
  admin_reply: string | null;
  created_at: string;
};

type MemberProfile = {
  id: string;
  full_name: string | null;
  account_number: string | null;
  phone: string | null;
  email: string | null;
};

type TicketWithMember = SupportTicket & {
  member: MemberProfile | null;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: "member" | "staff";
  message: string;
  created_at: string;
};

function normalizeStatus(value: string | null): TicketStatus {
  const status = value?.toLowerCase().trim();

  if (status === "resolved" || status === "closed") {
    return "resolved";
  }

  if (
    status === "under_review" ||
    status === "under review" ||
    status === "in_progress" ||
    status === "in progress"
  ) {
    return "under_review";
  }

  return "open";
}

function statusLabel(value: string | null) {
  const status = normalizeStatus(value);

  if (status === "resolved") return "Resolved";
  if (status === "under_review") return "Under Review";
  return "Open";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function SupportPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [tickets, setTickets] = useState<TicketWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [currentUserId, setCurrentUserId] = useState("");

  const [selectedTicket, setSelectedTicket] =
    useState<TicketWithMember | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<TicketStatus>("under_review");

  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const loadTickets = useCallback(
    async (mode: "load" | "refresh" = "load") => {
      if (mode === "load") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/");
          return;
        }

        setCurrentUserId(user.id);

        const { data: staff, error: staffError } = await supabase
          .from("staff_users")
          .select("id, role, is_active")
          .eq("id", user.id)
          .maybeSingle();

        if (staffError || !staff || staff.is_active !== true) {
          router.replace("/");
          return;
        }

        const { data: ticketRows, error: ticketError } = await supabase
          .from("support_tickets")
          .select(
            "id, user_id, ticket_number, category, subject, message, status, admin_reply, created_at"
          )
          .order("created_at", { ascending: false });

        if (ticketError) {
          throw ticketError;
        }

        const typedTickets = (ticketRows ?? []) as SupportTicket[];
        const userIds = [
          ...new Set(typedTickets.map((ticket) => ticket.user_id).filter(Boolean)),
        ];

        let memberMap = new Map<string, MemberProfile>();

        if (userIds.length > 0) {
          const { data: profileRows, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, account_number, phone, email")
            .in("id", userIds);

          if (!profileError) {
            memberMap = new Map(
              ((profileRows ?? []) as MemberProfile[]).map((profile) => [
                profile.id,
                profile,
              ])
            );
          }
        }

        const nextTickets = typedTickets.map((ticket) => ({
          ...ticket,
          member: memberMap.get(ticket.user_id) ?? null,
        }));

        setTickets(nextTickets);

        setSelectedTicket((current) => {
          if (!current) return current;
          return nextTickets.find((ticket) => ticket.id === current.id) ?? current;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setErrorMessage(`Unable to load support tickets: ${message}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, supabase]
  );

  const loadMessages = useCallback(
    async (ticketId: string, showLoader = true) => {
      if (showLoader) {
        setMessagesLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("ticket_messages")
          .select("id, ticket_id, sender_id, sender_type, message, created_at")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });

        if (error) {
          throw error;
        }

        setMessages((data ?? []) as TicketMessage[]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setErrorMessage(`Unable to load chat messages: ${message}`);
      } finally {
        if (showLoader) {
          setMessagesLoading(false);
        }
      }
    },
    [supabase]
  );

  useEffect(() => {
    void loadTickets();

    const channel = supabase
      .channel("admin-support-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          void loadTickets("refresh");
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadTickets, supabase]);

  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    const ticketId = selectedTicket.id;
    void loadMessages(ticketId);

    const channel = supabase
      .channel(`admin-ticket-chat-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          void loadMessages(ticketId, false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMessages, selectedTicket?.id, supabase]);

  useEffect(() => {
    if (!selectedTicket || messagesLoading) return;

    const timer = window.setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [messages, messagesLoading, selectedTicket]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const status = normalizeStatus(ticket.status);

      if (filter !== "all" && status !== filter) {
        return false;
      }

      if (!term) return true;

      const searchable = [
        ticket.member?.full_name ?? "",
        ticket.member?.account_number ?? "",
        ticket.member?.phone ?? "",
        ticket.ticket_number ?? ticket.id,
        ticket.category ?? "",
        ticket.subject,
        ticket.message,
      ];

      return searchable.some((value) => value.toLowerCase().includes(term));
    });
  }, [tickets, search, filter]);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "open"
      ).length,
      review: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "under_review"
      ).length,
      resolved: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "resolved"
      ).length,
    }),
    [tickets]
  );

  function openTicket(ticket: TicketWithMember) {
    setSelectedTicket(ticket);
    setSelectedStatus(
      normalizeStatus(ticket.status) === "open"
        ? "under_review"
        : normalizeStatus(ticket.status)
    );
    setReply("");
    setMessages([]);
    setSuccessMessage("");
    setErrorMessage("");
      void (async () => {
      const {
        error,
      } = await supabase.rpc(
        "mark_support_ticket_staff_read",
        {
          p_ticket_id:
            ticket.id,
        }
      );

      if (error) {
        console.error(
          "Unable to mark support ticket as read:",
          error.message
        );
      }
    })();
}

  function closeTicket() {
    if (sending || savingStatus) return;

    setSelectedTicket(null);
    setMessages([]);
    setReply("");
  }

  function updateTicketLocally(
    ticketId: string,
    changes: Partial<SupportTicket>
  ) {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, ...changes } : ticket
      )
    );

    setSelectedTicket((current) =>
      current?.id === ticketId ? { ...current, ...changes } : current
    );
  }

  async function saveTicketStatus() {
    if (!selectedTicket) return;

    setSavingStatus(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: selectedStatus })
        .eq("id", selectedTicket.id);

      if (error) {
        throw error;
      }

      updateTicketLocally(selectedTicket.id, { status: selectedStatus });
      setSuccessMessage(`Ticket status changed to ${statusLabel(selectedStatus)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Unable to update ticket status: ${message}`);
    } finally {
      setSavingStatus(false);
    }
  }

  async function sendMessage() {
    if (!selectedTicket) return;

    const cleanReply = reply.trim();

    if (!cleanReply) {
      setErrorMessage("Enter a message before sending.");
      return;
    }

    if (!currentUserId) {
      setErrorMessage("Your staff session could not be confirmed. Please refresh.");
      return;
    }

    if (normalizeStatus(selectedTicket.status) === "resolved") {
      setErrorMessage("This ticket is resolved. Reopen it before sending a message.");
      return;
    }

    setSending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: currentUserId,
          sender_type: "staff",
          message: cleanReply,
        });

      if (messageError) {
        throw messageError;
      }

      // Keep admin_reply updated while the current Flutter app still reads it.
      const { error: ticketError } = await supabase
        .from("support_tickets")
        .update({
          admin_reply: cleanReply,
          status: selectedStatus,
        })
        .eq("id", selectedTicket.id);

      if (ticketError) {
        throw ticketError;
      }

      updateTicketLocally(selectedTicket.id, {
        admin_reply: cleanReply,
        status: selectedStatus,
      });

      setReply("");
      setSuccessMessage("Message sent successfully.");
      await loadMessages(selectedTicket.id, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Unable to send message: ${message}`);
    } finally {
      setSending(false);
    }
  }

  const selectedIsResolved =
    selectedTicket !== null &&
    normalizeStatus(selectedTicket.status) === "resolved";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                GROW CIG ADMIN V2
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-950">
                Support Tickets
              </h1>
            </div>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadTickets("refresh")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-7 p-5 md:p-8">
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <section className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-6 text-white md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <MessageCircle size={26} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                Live Member Support
              </p>
              <h2 className="mt-3 text-2xl font-black md:text-3xl">
                Chat with members inside each support ticket
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                Every message is stored in the ticket conversation and updates in real time.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Tickets" value={stats.total} icon={MessageSquareReply} />
          <StatCard label="Open" value={stats.open} icon={Clock3} />
          <StatCard label="Under Review" value={stats.review} icon={MessageCircle} />
          <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Ticket Inbox</h2>
              <p className="mt-1 text-sm text-slate-500">
                Open a ticket to view the complete conversation and reply.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tickets..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 sm:w-72"
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as "all" | TicketStatus)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              Loading support tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
              <MessageSquareReply size={30} className="mx-auto text-slate-300" />
              <p className="mt-3 font-black text-slate-800">No support tickets found</p>
              <p className="mt-1 text-sm text-slate-500">
                New member tickets will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-900">
                            {ticket.ticket_number ?? ticket.id}
                          </p>
                          <p className="mt-1 max-w-[280px] truncate text-sm text-slate-500">
                            {ticket.subject}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900">
                            {ticket.member?.full_name ?? "Member"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {ticket.member?.account_number ?? ticket.user_id}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                          {ticket.category ?? "Other"}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={ticket.status} />
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                          {formatDate(ticket.created_at)}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => openTicket(ticket)}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700"
                          >
                            Open Chat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45">
          <button
            type="button"
            aria-label="Close ticket"
            onClick={closeTicket}
            className="absolute inset-0"
          />

          <aside className="relative z-10 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-6">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Live Support Chat
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-950">
                    {selectedTicket.ticket_number ?? selectedTicket.id}
                  </h2>
                  <StatusBadge status={selectedTicket.status} />
                </div>
              </div>

              <button
                type="button"
                onClick={closeTicket}
                disabled={sending || savingStatus}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <UserRound size={20} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-black text-slate-900">
                      {selectedTicket.member?.full_name ?? "Member"}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {selectedTicket.member?.account_number ?? selectedTicket.user_id}
                    </p>
                    {selectedTicket.member?.phone && (
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedTicket.member.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="min-w-0 md:text-right">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {selectedTicket.category ?? "Other"}
                  </span>
                  <p className="mt-2 font-black text-slate-900">
                    {selectedTicket.subject}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Opened {formatDate(selectedTicket.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 px-4 py-5 md:px-6">
              {messagesLoading ? (
                <div className="flex h-full min-h-60 items-center justify-center">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Loader2 size={18} className="animate-spin" />
                    Loading conversation...
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full min-h-60 items-center justify-center">
                  <div className="text-center">
                    <MessageCircle size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 font-black text-slate-700">No messages yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((chatMessage) => {
                    const isStaff = chatMessage.sender_type === "staff";
                    const isMine =
                      isStaff &&
                      Boolean(chatMessage.sender_id) &&
                      chatMessage.sender_id === currentUserId;

                    return (
                      <div
                        key={chatMessage.id}
                        className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[75%] ${
                            isStaff
                              ? "rounded-br-md bg-blue-600 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <p
                            className={`text-[11px] font-black uppercase tracking-wide ${
                              isStaff ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {isStaff
                              ? isMine
                                ? "You Â· Support"
                                : "Support Team"
                              : selectedTicket.member?.full_name ?? "Member"}
                          </p>

                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                            {chatMessage.message}
                          </p>

                          <p
                            className={`mt-2 text-[10px] ${
                              isStaff ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {formatTime(chatMessage.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white p-4 md:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Ticket Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value as TicketStatus)
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={
                    savingStatus ||
                    sending ||
                    selectedStatus === normalizeStatus(selectedTicket.status)
                  }
                  onClick={() => void saveTicketStatus()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingStatus ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : selectedIsResolved && selectedStatus !== "resolved" ? (
                    <RotateCcw size={17} />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                  {savingStatus ? "Saving..." : "Save Status"}
                </button>
              </div>

              {selectedIsResolved ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-black">This ticket is resolved.</p>
                  <p className="mt-1">
                    Change the status to Open or Under Review and save it before replying again.
                  </p>
                </div>
              ) : (
                <div className="flex items-end gap-3">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={3}
                    placeholder="Type a message to the member..."
                    className="min-h-20 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  />

                  <button
                    type="button"
                    disabled={sending || savingStatus || !reply.trim()}
                    onClick={() => void sendMessage()}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send message"
                  >
                    {sending ? (
                      <Loader2 size={19} className="animate-spin" />
                    ) : (
                      <Send size={19} />
                    )}
                  </button>
                </div>
              )}

              {!selectedIsResolved && (
                <p className="mt-2 text-xs text-slate-400">
                  Sending a message will also save the selected ticket status.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const normalized = normalizeStatus(status);

  const classes =
    normalized === "resolved"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "under_review"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${classes}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}