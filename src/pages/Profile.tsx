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
        )}
      </div>

      <div className="profile-card">
        <h2>Matches You Created</h2>
        {matchesLoading ? (
          <p>Loading...</p>
        ) : (
          <MatchList
            matches={createdMatches}
            emptyText="You haven't created any matches yet."
            emptyLinkTo="/create"
            emptyLinkText="Create one"
          />
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