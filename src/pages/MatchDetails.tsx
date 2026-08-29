import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { updateMatch, type UpdateMatchInput } from "../services/matchService";
import type { Match } from "../types";
import "./MatchDetails.css";

const SKILL_LEVELS = [
  "Beginner",
  "Casual",
  "Intermediate",
  "Advanced",
  "All Levels",
];

type EditForm = {
  title: string;
  skill_level: string;
  match_time: string;
  location: string;
  match_date: string;
  max_players: string;
  description: string;
};

function toForm(match: Match): EditForm {
  return {
    title: match.title,
    skill_level: match.skill_level ?? "",
    match_time: (match.match_time ?? "").slice(0, 5),
    location: match.location,
    match_date: match.match_date,
    max_players: String(match.max_players),
    description: match.description ?? "",
  };
}

export default function MatchDetails() {
  const { id } = useParams<{ id: string }>();

  const [match, setMatch] = useState<Match | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Host-only editing
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isHost =
    !!match && !!currentUserId && match.created_by === currentUserId;

  useEffect(() => {
    async function loadMatch() {
      if (!id) {
        return;
      }

      try {
        setLoading(true);

        // Get the match
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select("*")
          .eq("id", id)
          .single();

        if (matchError) {
          throw matchError;
        }

        setMatch(matchData);

        // Count participants
        const { count, error: countError } = await supabase
          .from("match_participants")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("match_id", id);

        if (countError) {
          throw countError;
        }

        setParticipantCount(count ?? 0);

        // Find currently logged-in user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setCurrentUserId(user?.id ?? null);

        if (user) {
          const { data: participant } = await supabase
            .from("match_participants")
            .select("user_id")
            .eq("match_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

          setJoined(participant !== null);
        }
      } catch (error) {
        console.error("Error loading match:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMatch();
  }, [id]);

  // Close the three-dot menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function startEditing() {
    if (!match) return;
    setForm(toForm(match));
    setEditError(null);
    setEditing(true);
    setMenuOpen(false);
  }

  function cancelEditing() {
    setEditing(false);
    setForm(null);
    setEditError(null);
  }

  function updateField<K extends keyof EditForm>(key: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !match || !form || !currentUserId) return;

    const maxPlayers = Number(form.max_players);
    if (!Number.isFinite(maxPlayers) || maxPlayers < 2) {
      setEditError("Number of players must be at least 2.");
      return;
    }

    const updates: UpdateMatchInput = {
      title: form.title.trim(),
      skill_level: form.skill_level || null,
      match_time: form.match_time,
      location: form.location.trim(),
      match_date: form.match_date,
      max_players: maxPlayers,
      description: form.description.trim() || null,
    };

    try {
      setSaving(true);
      setEditError(null);
      const updated = await updateMatch(id, currentUserId, updates);
      setMatch(updated);
      setEditing(false);
      setForm(null);
    } catch (error) {
      console.error("Error updating match:", error);
      setEditError(
        "Could not save changes. Only the host can edit this match.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleJoin() {
    if (!id || !match) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You need to log in before joining a match.");
      return;
    }

    if (participantCount >= match.max_players) {
      alert("This match is already full.");
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from("match_participants")
        .insert({
          match_id: id,
          user_id: user.id,
        });

      if (error) {
        throw error;
      }

      setJoined(true);
      setParticipantCount((count) => count + 1);
    } catch (error) {
      console.error("Error joining match:", error);
      alert("Could not join match.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    if (!id) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from("match_participants")
        .delete()
        .eq("match_id", id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setJoined(false);

      setParticipantCount((count) => Math.max(count - 1, 0));
    } catch (error) {
      console.error("Error leaving match:", error);
      alert("Could not leave match.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="match-details-page">
        <div className="match-details-card">
          <p>Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="match-details-page">
        <div className="match-details-card">
          <h1>Match not found</h1>
          <p>This match may have been removed.</p>
        </div>
      </div>
    );
  }

  const matchFull = participantCount >= match.max_players;

  return (
    <div className="match-details-page">
      <div className="match-details-card">
        {isHost && !editing && (
          <div className="match-host-menu" ref={menuRef}>
            <button
              type="button"
              className="match-host-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Match options"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">⋮</span>
            </button>

            {menuOpen && (
              <div className="match-host-menu-list" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="match-host-menu-item"
                  onClick={startEditing}
                >
                  Edit match details
                </button>
              </div>
            )}
          </div>
        )}

        {editing && form ? (
          <form className="match-edit-form" onSubmit={handleSave}>
            <h1>Edit match</h1>

            <label className="match-edit-field">
              <span>Match name</span>
              <input
                required
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </label>

            <label className="match-edit-field">
              <span>Skill level</span>
              <select
                value={form.skill_level}
                onChange={(e) => updateField("skill_level", e.target.value)}
              >
                <option value="">Not set</option>
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <div className="match-edit-row">
              <label className="match-edit-field">
                <span>Date</span>
                <input
                  required
                  type="date"
                  value={form.match_date}
                  onChange={(e) => updateField("match_date", e.target.value)}
                />
              </label>

              <label className="match-edit-field">
                <span>Time</span>
                <input
                  required
                  type="time"
                  value={form.match_time}
                  onChange={(e) => updateField("match_time", e.target.value)}
                />
              </label>
            </div>

            <label className="match-edit-field">
              <span>Location</span>
              <input
                required
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </label>

            <label className="match-edit-field">
              <span>Number of players</span>
              <input
                required
                type="number"
                min="2"
                max="100"
                value={form.max_players}
                onChange={(e) => updateField("max_players", e.target.value)}
              />
            </label>

            <label className="match-edit-field">
              <span>Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </label>

            {editError && <p className="match-edit-error">{editError}</p>}

            <div className="match-edit-actions">
              <button
                type="submit"
                className="match-edit-save"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                className="match-edit-cancel"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="match-details-header">
              <p className="match-sport">{match.sport}</p>

              <h1>{match.title}</h1>

              <span className="skill-level">
                {match.skill_level ?? "All Levels"}
              </span>
            </div>

            <div className="match-info">
              <div className="match-info-item">
                <span className="info-label">Location</span>
                <span>{match.location}</span>
              </div>

              <div className="match-info-item">
                <span className="info-label">Date</span>
                <span>{new Date(match.match_date).toLocaleDateString()}</span>
              </div>

              <div className="match-info-item">
                <span className="info-label">Time</span>
                <span>{match.match_time}</span>
              </div>

              <div className="match-info-item">
                <span className="info-label">Players</span>
                <span>
                  {participantCount} / {match.max_players}
                </span>
              </div>
            </div>

            <div className="match-description">
              <h2>About this match</h2>

              <p>{match.description || "No description has been provided."}</p>
            </div>

            {joined ? (
              <button
                className="leave-match-button"
                onClick={handleLeave}
                disabled={actionLoading}
              >
                {actionLoading ? "Leaving..." : "Leave Match"}
              </button>
            ) : (
              <button
                className="join-match-button"
                onClick={handleJoin}
                disabled={actionLoading || matchFull}
              >
                {matchFull
                  ? "Match Full"
                  : actionLoading
                    ? "Joining..."
                    : "Join Match"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
