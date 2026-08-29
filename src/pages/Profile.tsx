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
} from "../services/profileService";
import type { Profile as ProfileType, Match } from "../types";
import "./Profile.css";

const SKILL_LEVELS = ["Beginner", "Casual", "Intermediate", "Advanced", "All Levels"];

export default function Profile() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [editSkillLevel, setEditSkillLevel] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [createdMatches, setCreatedMatches] = useState<Match[]>([]);
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([]);

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

    Promise.all([fetchCreatedMatches(userId), fetchJoinedMatches(userId)])
      .then(([created, joined]) => {
        if (cancelled) return;
        setCreatedMatches(created);
        setJoinedMatches(joined);
      })
      .catch((err) => console.error(err));

    return () => { cancelled = true; };
  }, [userId]);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      const updated = await updateProfile(userId, { name: editName, skill_level: editSkillLevel || null });
      if (updated) setProfile(updated);
    } catch (err) {
      setProfileError((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  if (!userId) return null; // App.tsx already gates this behind auth

  return (
    <section className="page">
      <h1>{profile?.name ? `Hi, ${profile.name}` : "Your Profile"}</h1>
      <button type="button" className="profile-link-button" onClick={() => signOut()}>Sign Out</button>

      {profileLoading ? (
        <p>Loading profile...</p>
      ) : (
        <form onSubmit={handleProfileSubmit} className="profile-form">
          <input required value={editName} onChange={(e) => setEditName(e.target.value)} />
          <input value={session?.user.email ?? ""} disabled />
          <select value={editSkillLevel} onChange={(e) => setEditSkillLevel(e.target.value)}>
            <option value="">Not set</option>
            {SKILL_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>

          {profileError && <p className="profile-error">{profileError}</p>}
          <button type="submit" className="profile-button" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      <h2>Matches You Created</h2>
      {createdMatches.length === 0 ? (
        <p>You haven't created any matches yet. <Link to="/create">Create one</Link>.</p>
      ) : (
        createdMatches.map((m) => (
          <Link key={m.id} to={`/matches/${m.id}`}>
            <p>{m.title} — {m.sport} @ {m.location}</p>
          </Link>
        ))
      )}

      <h2>Matches You've Joined</h2>
      {joinedMatches.length === 0 ? (
        <p>You haven't joined any matches yet. <Link to="/">Browse matches</Link>.</p>
      ) : (
        joinedMatches.map((m) => (
          <Link key={m.id} to={`/matches/${m.id}`}>
            <p>{m.title} — {m.sport} @ {m.location}</p>
          </Link>
        ))
      )}
    </section>
  );
}