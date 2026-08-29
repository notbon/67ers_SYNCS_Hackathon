import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  acceptFriendRequest,
  findPeople,
  removeFriendship,
  sendFriendRequest,
} from "../services/friendService";
import type { SearchResult } from "../services/friendService";
import { useFriendRequests } from "../context/FriendRequestsContext";
import { avatarColour, initials } from "../lib/avatar";
import "./Search.css";

export default function Search() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Shared with the navbar badge so the count and the list stay in step.
  const { requests, refresh: refreshRequests } = useFriendRequests();

  const term = query.trim();

  useEffect(() => {
    if (!userId || term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setError(null);

    const timer = window.setTimeout(() => {
      findPeople(term, userId)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch((err) => {
          console.error("Search failed:", err);
          if (!cancelled) setError("Couldn't run that search. Try again.");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, userId]);

  function patch(id: string, next: Partial<SearchResult>) {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...next } : r)),
    );
  }

  async function add(person: SearchResult) {
    if (!userId) return;
    setBusy(person.id);
    try {
      await sendFriendRequest(userId, person.id);
      const refreshed = await findPeople(term, userId);
      setResults(refreshed);
      await refreshRequests();
    } catch (err) {
      console.error("Failed to send request:", err);
      setError("Couldn't send that request.");
    } finally {
      setBusy(null);
    }
  }

  async function cancelOrDecline(person: SearchResult) {
    if (!person.requestId) return;
    setBusy(person.id);
    try {
      await removeFriendship(person.requestId);
      patch(person.id, { status: "none", requestId: undefined });
      await refreshRequests();
    } catch (err) {
      console.error("Failed to remove request:", err);
      setError("Couldn't update that request.");
    } finally {
      setBusy(null);
    }
  }

  async function accept(person: SearchResult) {
    if (!person.requestId) return;
    setBusy(person.id);
    try {
      await acceptFriendRequest(person.requestId);
      patch(person.id, { status: "friends" });
      await refreshRequests();
    } catch (err) {
      console.error("Failed to accept request:", err);
      setError("Couldn't accept that request.");
    } finally {
      setBusy(null);
    }
  }

  async function respondToRequest(id: string, accepted: boolean) {
    setBusy(id);
    try {
      if (accepted) await acceptFriendRequest(id);
      else await removeFriendship(id);
      await refreshRequests();
      if (userId && term.length >= 2) setResults(await findPeople(term, userId));
    } catch (err) {
      console.error("Failed to respond to request:", err);
      setError("Couldn't update that request.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="page search-page" aria-labelledby="search-title">
      <p className="eyebrow">Find people</p>
      <h1 id="search-title">Search</h1>
      <p className="page-subtitle">
        Look someone up by name, or by their full email address if you know it.
      </p>

      {userId && (
        <section className="requests-panel" aria-labelledby="requests-title">
          <h2 id="requests-title" className="requests-title">
            Friend requests
            <span className="requests-count">{requests.length}</span>
          </h2>

          {requests.length === 0 && (
            <p className="requests-empty">
              No pending requests. When someone adds you, they'll appear here.
            </p>
          )}

          <ul className="search-results" role="list">
            {requests.map((r) => (
              <li key={r.id} className="search-result">
                <span
                  className="search-avatar"
                  style={{ background: avatarColour(r.requester.id) }}
                  aria-hidden="true"
                >
                  {initials(r.requester.name)}
                </span>
                <span className="search-name">{r.requester.name}</span>
                <span className="search-action">
                  <button
                    type="button"
                    className="btn-add"
                    disabled={busy === r.id}
                    onClick={() => respondToRequest(r.id, true)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn-quiet"
                    disabled={busy === r.id}
                    onClick={() => respondToRequest(r.id, false)}
                  >
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form className="search-form" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="people-search" className="visually-hidden">
          Search by name or email
        </label>
        <input
          id="people-search"
          type="search"
          className="search-input"
          placeholder="Name or full email address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </form>

      {!userId && (
        <p className="search-note">Sign in to search for people and add friends.</p>
      )}

      {error && <p className="search-error">{error}</p>}

      {userId && term.length > 0 && term.length < 2 && (
        <p className="search-note">Keep typing — at least two characters.</p>
      )}

      {userId && term.length >= 2 && (
        <>
          <p className="search-count" aria-live="polite">
            {searching
              ? "Searching…"
              : `${results.length} ${results.length === 1 ? "person" : "people"} found`}
          </p>

          {!searching && results.length === 0 && (
            <p className="search-note">
              Nobody matched that.
              {!term.includes("@") &&
                " If you know their email address, try the full address."}
            </p>
          )}

          <ul className="search-results" role="list">
            {results.map((person) => (
              <li key={person.id} className="search-result">
                <span
                  className="search-avatar"
                  style={{ background: avatarColour(person.id) }}
                  aria-hidden="true"
                >
                  {initials(person.name)}
                </span>

                <span className="search-name">{person.name}</span>

                <span className="search-action">
                  {person.status === "friends" && (
                    <span className="search-tag">Friends</span>
                  )}

                  {person.status === "none" && (
                    <button
                      type="button"
                      className="btn-add"
                      disabled={busy === person.id}
                      onClick={() => add(person)}
                    >
                      Add friend
                    </button>
                  )}

                  {person.status === "outgoing" && (
                    <>
                      <span className="search-tag">Requested</span>
                      <button
                        type="button"
                        className="btn-quiet"
                        disabled={busy === person.id}
                        onClick={() => cancelOrDecline(person)}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {person.status === "incoming" && (
                    <>
                      <button
                        type="button"
                        className="btn-add"
                        disabled={busy === person.id}
                        onClick={() => accept(person)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn-quiet"
                        disabled={busy === person.id}
                        onClick={() => cancelOrDecline(person)}
                      >
                        Decline
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
