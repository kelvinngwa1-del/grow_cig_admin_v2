"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  History,
  MessageSquareText,
  RefreshCw,
  Send,
  UserRound,
  Users,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

type Recipient = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  account_number: string | null;
};

type SentNotification = {
  id: string;
  recipient_scope: "all" | "single";
  recipient_user_id: string | null;
  recipient_label: string;
  recipient_count: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
};

type TemplateOption = {
  id: string;
  label: string;
  title: string;
  message: string;
};

const templates: TemplateOption[] = [
  {
    id: "savings_reminder",
    label: "Savings Reminder",
    title: "Keep Your Savings Goal Moving",
    message:
      "Keep your savings journey active. A small deposit today brings you closer to your goal. Open GROW CIG and continue building your financial future.",
  },
  {
    id: "loan_repayment",
    label: "Loan Repayment Reminder",
    title: "Loan Repayment Reminder",
    message:
      "Please review your upcoming loan repayment date and ensure that you are prepared to make your payment on time. Thank you for maintaining good financial discipline with GROW CIG.",
  },
  {
    id: "important_announcement",
    label: "Important Announcement",
    title: "Important GROW CIG Update",
    message:
      "GROW CIG has an important update for members. Please review your account and stay connected for the latest information from our team.",
  },
  {
    id: "custom",
    label: "Custom Message",
    title: "",
    message: "",
  },
];

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
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

function recipientName(
  recipient: Recipient
) {
  const name =
    recipient.full_name?.trim() ||
    recipient.email?.trim() ||
    "Member";

  const account =
    recipient.account_number?.trim();

  return account
    ? `${name} • ${account}`
    : name;
}

export default function NotificationsPage() {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const firstTemplate =
    templates[0];

  const [
    templateId,
    setTemplateId,
  ] =
    useState(
      firstTemplate.id
    );

  const [
    recipientMode,
    setRecipientMode,
  ] =
    useState<
      "all" | "single"
    >("all");

  const [
    selectedUserId,
    setSelectedUserId,
  ] =
    useState("");

  const [
    title,
    setTitle,
  ] =
    useState(
      firstTemplate.title
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      firstTemplate.message
    );

  const [
    recipients,
    setRecipients,
  ] =
    useState<
      Recipient[]
    >([]);

  const [
    history,
    setHistory,
  ] =
    useState<
      SentNotification[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const loadData =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (silent) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setErrorMessage(
            ""
          );

          const [
            recipientResult,
            historyResult,
          ] =
            await Promise.all([
              supabase.rpc(
                "admin_list_notification_recipients"
              ),
              supabase.rpc(
                "admin_recent_notification_broadcasts",
                {
                  p_limit:
                    50,
                }
              ),
            ]);

          if (
            recipientResult.error
          ) {
            throw recipientResult.error;
          }

          if (
            historyResult.error
          ) {
            throw historyResult.error;
          }

          const recipientRows =
            (
              recipientResult.data ||
              []
            ) as Recipient[];

          const historyRows =
            (
              historyResult.data ||
              []
            ) as SentNotification[];

          setRecipients(
            recipientRows
          );

          setHistory(
            historyRows
          );

          setSelectedUserId(
            (
              current
            ) => {
              if (
                current &&
                recipientRows.some(
                  (
                    item
                  ) =>
                    item.user_id ===
                    current
                )
              ) {
                return current;
              }

              return (
                recipientRows[0]
                  ?.user_id ||
                ""
              );
            }
          );
        } catch (
          error: unknown
        ) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load notification data."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        supabase,
      ]
    );

  useEffect(() => {
    void loadData();
  }, [
    loadData,
  ]);

  function changeTemplate(
    value: string
  ) {
    setTemplateId(
      value
    );

    const template =
      templates.find(
        (
          item
        ) =>
          item.id ===
          value
      );

    if (!template) {
      return;
    }

    setTitle(
      template.title
    );

    setMessage(
      template.message
    );

    setSuccessMessage(
      ""
    );

    setErrorMessage(
      ""
    );
  }

  async function sendNotification() {
    const cleanTitle =
      title.trim();

    const cleanMessage =
      message.trim();

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );

    if (!cleanTitle) {
      setErrorMessage(
        "Enter a notification title."
      );
      return;
    }

    if (!cleanMessage) {
      setErrorMessage(
        "Enter a notification message."
      );
      return;
    }

    if (
      recipientMode ===
        "single" &&
      !selectedUserId
    ) {
      setErrorMessage(
        "Select a member."
      );
      return;
    }

    if (
      recipientMode ===
      "all"
    ) {
      const confirmed =
        window.confirm(
          `Send this notification to all ${recipients.length.toLocaleString()} member profiles?`
        );

      if (!confirmed) {
        return;
      }
    }

    try {
      setSending(
        true
      );

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "admin_send_member_notification",
          {
            p_user_id:
              recipientMode ===
              "single"
                ? selectedUserId
                : null,
            p_title:
              cleanTitle,
            p_message:
              cleanMessage,
            p_type:
              templateId ===
              "custom"
                ? "admin_custom"
                : `admin_${templateId}`,
          }
        );

      if (error) {
        throw error;
      }

      const payload =
        data &&
        typeof data ===
          "object" &&
        !Array.isArray(
          data
        )
          ? (
              data as Record<
                string,
                unknown
              >
            )
          : {};

      const count =
        Number(
          payload.recipient_count ||
            0
        );

      setSuccessMessage(
        count === 1
          ? "Notification sent successfully to 1 member."
          : `Notification sent successfully to ${count.toLocaleString()} members.`
      );

      await loadData(
        true
      );
    } catch (
      error: unknown
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send notification."
      );
    } finally {
      setSending(
        false
      );
    }
  }

  const selectedRecipient =
    recipients.find(
      (
        item
      ) =>
        item.user_id ===
        selectedUserId
    );

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
                <BellRing
                  size={
                    23
                  }
                />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                  Member Communication
                </p>

                <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
                  Notification Center
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
              Send in-app messages directly to the notification bell in the GROW CIG member app. Choose a reusable message or write your own.
            </p>
          </div>

          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() =>
              void loadData(
                true
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={
                17
              }
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertCircle
              size={
                20
              }
              className="mt-0.5 shrink-0"
            />
            <span>
              {
                errorMessage
              }
            </span>
          </div>
        )}

        {successMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            <CheckCircle2
              size={
                20
              }
              className="mt-0.5 shrink-0"
            />
            <span>
              {
                successMessage
              }
            </span>
          </div>
        )}

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">

          <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <MessageSquareText
                  size={
                    21
                  }
                />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Compose Notification
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Preset messages can be edited before sending.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500">
                Loading notification tools...
              </div>
            ) : (
              <div className="mt-7 space-y-6">

                <div>
                  <label className="text-sm font-black text-slate-800">
                    Recipient
                  </label>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRecipientMode(
                          "all"
                        )
                      }
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                        recipientMode ===
                        "all"
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Users
                        size={
                          21
                        }
                        className={
                          recipientMode ===
                          "all"
                            ? "text-blue-700"
                            : "text-slate-500"
                        }
                      />

                      <div>
                        <p className="font-black text-slate-900">
                          All Members
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {recipients.length.toLocaleString()} profiles
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setRecipientMode(
                          "single"
                        )
                      }
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                        recipientMode ===
                        "single"
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <UserRound
                        size={
                          21
                        }
                        className={
                          recipientMode ===
                          "single"
                            ? "text-blue-700"
                            : "text-slate-500"
                        }
                      />

                      <div>
                        <p className="font-black text-slate-900">
                          Specific Member
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Send privately
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {recipientMode ===
                  "single" && (
                  <div>
                    <label
                      htmlFor="member"
                      className="text-sm font-black text-slate-800"
                    >
                      Select Member
                    </label>

                    <select
                      id="member"
                      value={
                        selectedUserId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedUserId(
                          event.target
                            .value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      {recipients.length ===
                      0 ? (
                        <option value="">
                          No member profiles available
                        </option>
                      ) : (
                        recipients.map(
                          (
                            recipient
                          ) => (
                            <option
                              key={
                                recipient.user_id
                              }
                              value={
                                recipient.user_id
                              }
                            >
                              {recipientName(
                                recipient
                              )}
                            </option>
                          )
                        )
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="template"
                    className="text-sm font-black text-slate-800"
                  >
                    Message Template
                  </label>

                  <select
                    id="template"
                    value={
                      templateId
                    }
                    onChange={(
                      event
                    ) =>
                      changeTemplate(
                        event.target
                          .value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {templates.map(
                      (
                        template
                      ) => (
                        <option
                          key={
                            template.id
                          }
                          value={
                            template.id
                          }
                        >
                          {
                            template.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  <p className="mt-2 text-xs text-slate-500">
                    Choose one of the regular GROW CIG messages or select Custom Message.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="title"
                    className="text-sm font-black text-slate-800"
                  >
                    Notification Title
                  </label>

                  <input
                    id="title"
                    type="text"
                    maxLength={
                      120
                    }
                    value={
                      title
                    }
                    onChange={(
                      event
                    ) =>
                      setTitle(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter notification title"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <p className="mt-2 text-right text-xs text-slate-400">
                    {title.length}/120
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="text-sm font-black text-slate-800"
                  >
                    Message
                  </label>

                  <textarea
                    id="message"
                    rows={
                      7
                    }
                    maxLength={
                      1000
                    }
                    value={
                      message
                    }
                    onChange={(
                      event
                    ) =>
                      setMessage(
                        event.target
                          .value
                      )
                    }
                    placeholder="Type your message here..."
                    className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <p className="mt-2 text-right text-xs text-slate-400">
                    {message.length}/1000
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    sending ||
                    recipients.length ===
                      0
                  }
                  onClick={() =>
                    void sendNotification()
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send
                    size={
                      18
                    }
                  />

                  {sending
                    ? "Sending..."
                    : recipientMode ===
                        "all"
                      ? "Send to All Members"
                      : "Send Notification"}
                </button>

              </div>
            )}
          </section>

          <aside className="space-y-6">

            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <BellRing
                  size={
                    21
                  }
                  className="text-blue-700"
                />

                <h2 className="font-black text-blue-950">
                  Member Preview
                </h2>
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
                    <BellRing
                      size={
                        18
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-950">
                      {title.trim() ||
                        "Notification title"}
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {message.trim() ||
                        "Your notification message will appear here."}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      GROW CIG • Just now
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-white/70 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Sending to
                </p>

                <p className="mt-2 text-sm font-black text-slate-900">
                  {recipientMode ===
                  "all"
                    ? `All Members (${recipients.length.toLocaleString()})`
                    : selectedRecipient
                      ? recipientName(
                          selectedRecipient
                        )
                      : "No member selected"}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
              <div className="flex items-center gap-3">
                <History
                  size={
                    21
                  }
                  className="text-slate-700"
                />

                <div>
                  <h2 className="font-black text-slate-950">
                    Recent Sent
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Latest administrator messages
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                    Loading history...
                  </div>
                ) : history.length ===
                  0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-800">
                      No admin notifications sent yet
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Messages sent from this page will be recorded here.
                    </p>
                  </div>
                ) : (
                  history
                    .slice(
                      0,
                      8
                    )
                    .map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-black text-slate-900">
                              {
                                item.title
                              }
                            </p>

                            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                              {item.recipient_scope ===
                              "all"
                                ? `${item.recipient_count} members`
                                : "1 member"}
                            </span>
                          </div>

                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                            {
                              item.message
                            }
                          </p>

                          <p className="mt-3 text-[11px] font-semibold text-slate-400">
                            {item.recipient_label} •{" "}
                            {formatDate(
                              item.created_at
                            )}
                          </p>
                        </div>
                      )
                    )
                )}
              </div>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}
