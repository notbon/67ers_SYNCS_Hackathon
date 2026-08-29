import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchProfile,
  updateProfile,
  signOut,
  fetchCreatedMatches,
  fetchJoinedMatches,
  deleteAccount,
  uploadAvatar,
} from "../services/profileService";
import type { Profile as ProfileType, Match } from "../types";
import "./Profile.css";

const SKILL_LEVELS = ["Beginner", "Casual", "Intermediate", "Advanced", "All Levels"];

function MatchList({ matches, emptyText, emptyLinkTo, emptyLinkText }: {
  matches: Match[];
  emptyText: string;
  emptyLinkTo: string;
  emptyLinkText: string;
}) {
  if (matches.length === 0) {
    return (
      <p className="profile-empty">
        {emptyText} <Link to={emptyLinkTo}>{emptyLinkText}</Link>.
      </p>
    );
  }

  return (
    <div className="profile-match-list">
      {matches.map((m) => (
        <Link key={m.id} to={`/matches/${m.id}`} className="profile-match-row">
          <p className="profile-match-title">{m.title}</p>
          <p className="profile-match-meta">{m.sport} · {m.location}</p>
        </Link>
      ))}
    </div>
  );
}

function formatMatchDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMatchTime(time: string): string {
  const hhmm = (time ?? "").slice(0, 5);
  const parsed = new Date(`2000-01-01T${hhmm}:00`);
  if (Number.isNaN(parsed.getTime())) return hhmm;
  return parsed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Interactive version of MatchList for the matches the signed-in user hosts:
// each row expands in place to show the full details, and links through to the
// match page.
function HostedMatchList({ matches }: { matches: Match[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (matches.length === 0) {
    return (
      <p className="profile-empty">
        You aren't hosting any matches yet. <Link to="/create">Create one</Link>.
      </p>
    );
  }

  return (
    <ul className="profile-hosted-list">
      {matches.map((m) => {
        const open = expandedId === m.id;
        const panelId = `hosted-match-${m.id}`;

        return (
          <li key={m.id} className="profile-hosted-item">
            <button
              type="button"
              className="profile-hosted-summary"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setExpandedId(open ? null : m.id)}
            >
              <span className="profile-hosted-heading">
                <span className="profile-hosted-title">{m.title}</span>
                <span className="profile-hosted-meta">{m.sport} · {m.location}</span>
              </span>
              <span
                className={`profile-hosted-chevron${open ? " is-open" : ""}`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {open && (
              <div className="profile-hosted-detail" id={panelId}>
                <dl className="profile-hosted-facts">
                  <div>
                    <dt>Date</dt>
                    <dd>{formatMatchDate(m.match_date)}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>{formatMatchTime(m.match_time)}</dd>
                  </div>
                  <div>
                    <dt>Skill level</dt>
                    <dd>{m.skill_level ?? "All Levels"}</dd>
                  </div>
                  <div>
                    <dt>Max players</dt>
                    <dd>{m.max_players}</dd>
                  </div>
                </dl>

                {m.description && (
                  <p className="profile-hosted-description">{m.description}</p>
                )}

                <Link to={`/matches/${m.id}`} className="profile-hosted-open">
                  Open match page →
                </Link>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Profile() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [editSkillLevel, setEditSkillLevel] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [createdMatches, setCreatedMatches] = useState<Match[]>([]);
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setProfileLoading(true);

    fetchProfile(userId)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setEditName(data?.name ?? "");
        setEditSkillLevel(data?.skill_level ?? "");
      })
      .catch((err) => setProfileError((err as Error).message))
      .finally(() => { if (!cancelled) setProfileLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setMatchesLoading(true);

    Promise.all([fetchCreatedMatches(userId), fetchJoinedMatches(userId)])
      .then(([created, joined]) => {
        if (cancelled) return;
        setCreatedMatches(created);
        setJoinedMatches(joined);
      })
      .catch((err) => console.error(err))
      .finally(() => { if (!cancelled) setMatchesLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    setProfileError(null);
    setSaveSuccess(false);
    try {
      const updated = await updateProfile(userId, { name: editName, skill_level: editSkillLevel || null });
      if (updated) setProfile(updated);
      setSaveSuccess(true);
    } catch (err) {
      setProfileError((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const url = await uploadAvatar(userId, file);
      const updated = await updateProfile(userId, { avatar_url: url });
      if (updated) setProfile(updated);
    } catch (err) {
      setAvatarError((err as Error).message);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!userId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(userId);
      // signOut() inside deleteAccount clears the session; AuthContext
      // picks that up and Splash renders automatically.
    } catch (err) {
      setDeleteError((err as Error).message);
      setDeleting(false);
    }
  }

  if (!userId) return null; // App.tsx already gates this behind auth

  return (
    <section className="page">
      <div className="profile-page-header">
        <div>
          <h1>{profile?.name ? `Hi, ${profile.name}` : "Your Profile"}</h1>
          <p className="page-subtitle">Manage your details and keep track of your matches.</p>
        </div>
        <button type="button" className="profile-link-button" onClick={() => signOut()}>
          Sign Out
        </button>
      </div>

      <div className="profile-card">
        <h2>Account Details</h2>

        {profileLoading ? (
          <p>Loading profile...</p>
        ) : (
          <>
            <div className="profile-avatar-block">
              <img
                src={profile?.avatar_url || "/default-avatar.png"}
                alt="Profile"
                className="profile-avatar"
              />
              <label className="profile-link-button">
                {avatarUploading ? "Uploading..." : "Change Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                  style={{ display: "none" }}
                />
              </label>
              {avatarError && <p className="profile-error">{avatarError}</p>}
            </div>

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <label className="profile-field">
                <span>Name</span>
                <input required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </label>

              <label className="profile-field">
                <span>Email</span>
                <input value={session?.user.email ?? ""} disabled />
              </label>

              <label className="profile-field">
                <span>Skill Level</span>
                <select value={editSkillLevel} onChange={(e) => setEditSkillLevel(e.target.value)}>
                  <option value="">Not set</option>
                  {SKILL_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>

              {profileError && <p className="profile-error">{profileError}</p>}
              {saveSuccess && !profileError && <p className="profile-notice">Saved!</p>}

              <button type="submit" className="profile-button" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="profile-card">
        <h2>Matches You're Hosting</h2>
        {matchesLoading ? (
          <p>Loading...</p>
        ) : (
          <HostedMatchList matches={createdMatches} />
        )}
      </div>

      <div className="profile-card">
        <h2>Matches You've Joined</h2>
        {matchesLoading ? (
          <p>Loading...</p>
        ) : (
          <MatchList
            matches={joinedMatches}
            emptyText="You haven't joined any matches yet."
            emptyLinkTo="/"
            emptyLinkText="Browse matches"
          />
        )}
      </div>

      <div className="profile-card danger-zone">
        <h2>Delete Account</h2>
        <p className="profile-danger-copy">
          This permanently deletes your profile, matches you created, and your join history.
        </p>

        {!confirmingDelete ? (
          <button type="button" className="profile-danger-button" onClick={() => setConfirmingDelete(true)}>
            Delete My Account
          </button>
        ) : (
          <div>
            <p className="profile-error">Are you sure? This can't be undone.</p>
            {deleteError && <p className="profile-error">{deleteError}</p>}
            <div className="profile-danger-actions">
              <button type="button" className="profile-danger-button" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, delete everything"}
              </button>
              <button type="button" className="profile-link-button" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}