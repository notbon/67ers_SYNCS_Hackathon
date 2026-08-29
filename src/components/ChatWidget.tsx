import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "../context/AuthContext";
import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  unsubscribe,
} from "../services/chatService";
import type { ChatMessage, Conversation } from "../services/chatService";
import {
  acceptFriendRequest,
  fetchCoAttendees,
  fetchFriends,
  fetchMyMatches,
  fetchPendingRequests,
} from "../services/friendService";
import type { FriendRequest, Person } from "../services/friendService";
import "./ChatWidget.css";

type Tab = "public" | "events" | "friends";

const TABS: { id: Tab; label: string }[] = [
  { id: "public", label: "Public" },
  { id: "events", label: "Events" },
  { id: "friends", label: "Friends" },
];

function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function ChatWidget() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("public");

  // Which thread is on screen. Null while showing a picker list.
  const [conversation, setConversation] = useState<Conversation | null>({
    scope: "public",
  });
  const [threadTitle, setThreadTitle] = useState("Everyone");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [myMatches, setMyMatches] = useState<
    { id: string; title: string; sport: string }[]
  >([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // --- Close on Escape ---
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // --- Load + subscribe to the active conversation ---
  useEffect(() => {
    if (!open || !userId || !conversation) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMessages(conversation, userId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        if (!cancelled) setError("Couldn't load this conversation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    channelRef.current = subscribeToMessages(conversation, userId, (msg) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    });

    return () => {
      cancelled = true;
      unsubscribe(channelRef.current);
      channelRef.current = null;
    };
  }, [open, userId, conversation]);

  // --- Load the picker lists ---
  useEffect(() => {
    if (!open || !userId) return;

    if (tab === "events") {
      fetchMyMatches(userId)
        .then(setMyMatches)
        .catch((err) => console.error("Failed to load your matches:", err));
    }

    if (tab === "friends") {
      Promise.all([
        fetchFriends(userId),
        fetchCoAttendees(userId),
        fetchPendingRequests(userId),
      ])
        .then(([friends, coAttendees, pending]) => {
          const merged = new Map<string, Person>();
          friends.forEach((p) => merged.set(p.id, p));
          coAttendees.forEach((p) => merged.set(p.id, p));
          setPeople([...merged.values()]);
          setRequests(pending);
        })
        .catch((err) => console.error("Failed to load people:", err));
    }
  }, [open, userId, tab]);

  // --- Keep the newest message in view ---
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const openTab = useCallback((next: Tab) => {
    setTab(next);
    setMessages([]);
    if (next === "public") {
      setConversation({ scope: "public" });
      setThreadTitle("Everyone");
    } else {
      // Events and Friends start on their picker list.
      setConversation(null);
      setThreadTitle("");
    }
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !conversation || !draft.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      await sendMessage(conversation, userId, draft);
      setDraft("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Message not sent. You may not have access to this chat.");
    } finally {
      setSending(false);
    }
  }

  function onComposerKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(e as unknown as React.FormEvent);
    }
  }

  async function accept(id: string) {
    try {
      await acceptFriendRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (userId) setPeople(await fetchFriends(userId));
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  }

  const showComposer = conversation !== null;
  const canGoBack = conversation !== null && tab !== "public";

  return (
    <>
      <button
        type="button"
        className={`chat-fab ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 5l14 14M19 5L5 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="square"
            />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3.5 4.5h17v12h-11l-6 4.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinejoin="miter"
            />
            <path
              d="M7.5 9h9M7.5 12.5h6"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="square"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="chat-panel"
          id="chat-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Chat"
        >
          <div className="chat-head">
            {canGoBack && (
              <button
                type="button"
                className="chat-back"
                onClick={() => {
                  setConversation(null);
                  setThreadTitle("");
                  setMessages([]);
                }}
                aria-label="Back to list"
              >
                ←
              </button>
            )}
            <h2 className="chat-title">
              {conversation ? threadTitle : tab === "events" ? "Your events" : "People"}
            </h2>
            <button
              type="button"
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="chat-tabs" role="tablist" aria-label="Chat channels">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`chat-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="chat-body"
                className={`chat-tab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => openTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            className="chat-body"
            id="chat-body"
            role="tabpanel"
            aria-labelledby={`chat-tab-${tab}`}
          >
            {!userId ? (
              <p className="chat-empty">
                Sign in from your profile to join the conversation.
              </p>
            ) : conversation ? (
              <div className="chat-messages" ref={listRef} aria-live="polite">
                {loading && <p className="chat-empty">Loading…</p>}
                {!loading && messages.length === 0 && (
                  <p className="chat-empty">No messages yet. Say something.</p>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <article
                      key={m.id}
                      className={`chat-msg ${mine ? "is-mine" : ""}`}
                    >
                      <header className="chat-msg-head">
                        <span className="chat-msg-name">
                          {mine ? "You" : m.sender_name}
                        </span>
                        <time className="chat-msg-time" dateTime={m.created_at}>
                          {timeOf(m.created_at)}
                        </time>
                      </header>
                      <p className="chat-msg-body">{m.body}</p>
                    </article>
                  );
                })}
              </div>
            ) : tab === "events" ? (
              <ul className="chat-list" role="list">
                {myMatches.length === 0 && (
                  <li className="chat-empty">
                    Join a match and its chat room shows up here.
                  </li>
                )}
                {myMatches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="chat-list-item"
                      onClick={() => {
                        setConversation({ scope: "match", matchId: m.id });
                        setThreadTitle(m.title);
                      }}
                    >
                      <span className="chat-list-name">{m.title}</span>
                      <span className="chat-list-meta">{m.sport}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="chat-list-wrap">
                {requests.length > 0 && (
                  <section className="chat-requests">
                    <h3 className="chat-subhead">Friend requests</h3>
                    <ul className="chat-list" role="list">
                      {requests.map((r) => (
                        <li key={r.id} className="chat-request">
                          <span className="chat-list-name">
                            {r.requester.name}
                          </span>
                          <button
                            type="button"
                            className="chat-accept"
                            onClick={() => accept(r.id)}
                          >
                            Accept
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <h3 className="chat-subhead">Friends &amp; people at your events</h3>
                <ul className="chat-list" role="list">
                  {people.length === 0 && (
                    <li className="chat-empty">
                      No one yet. Join a match to meet people you can message.
                    </li>
                  )}
                  {people.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="chat-list-item"
                        onClick={() => {
                          setConversation({ scope: "direct", userId: p.id });
                          setThreadTitle(p.name);
                        }}
                      >
                        <span className="chat-list-name">{p.name}</span>
                        <span className="chat-list-meta">Message</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && <p className="chat-error">{error}</p>}

          {userId && showComposer && (
            <form className="chat-composer" onSubmit={handleSend}>
              <label htmlFor="chat-input" className="visually-hidden">
                Message
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                className="chat-input"
                rows={1}
                placeholder="Write a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onComposerKey}
              />
              <button
                type="submit"
                className="chat-send"
                disabled={!draft.trim() || sending}
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

export default ChatWidget;
