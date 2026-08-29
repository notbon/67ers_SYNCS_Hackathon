import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchPublicProfile, fetchPlayerStats } from "../services/playerService";
import Avatar from "../components/Avatar";
import type { PublicProfile, PlayerStats } from "../types";
import "./PlayerProfile.css";

// Badge system isn't built yet — this just documents what's coming so the
// section has a place on the page. See the "Badges" spec:
//  - endorsement badge: 5 endorsements of one kind
//  - sport badge: >5 wins in a single sport
//  - all-rounder: at least one match of every sport
const PLANNED_BADGES = [
  "Endorsed — 5 endorsements of the same kind",
  "Sport specialist — more than 5 wins in one sport",
  "All-rounder — played at least one match of every sport",
];

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isSelf = !!id && session?.user?.id === id;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    fetchPublicProfile(id)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setProfile(data);
        return fetchPlayerStats(id).then((s) => {
          if (!cancelled) setStats(s);
        });
      })
      .catch((err) => {
        console.error("Failed to load player profile:", err);
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <section className="page player-profile">
      <button
        type="button"
        className="player-back"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {loading && <p className="player-status">Loading profile…</p>}

      {!loading && notFound && (
        <p className="player-status">
          This player could not be found. <Link to="/">Browse matches</Link>.
        </p>
      )}

      {!loading && profile && (
        <>
          <header className="player-hero">
            <Avatar
              id={profile.id}
              name={profile.name}
              url={profile.avatar_url}
              size={96}
              className="player-hero-avatar"
            />
            <div className="player-hero-text">
              <h1>{profile.name || "Player"}</h1>
              <p className="player-skill">
                {profile.skill_level ?? "Skill level not set"}
              </p>
              {isSelf && (
                <Link to="/profile" className="player-hero-edit">
                  Edit your profile →
                </Link>
              )}
            </div>
          </header>

          <div className="player-stats">
            <div className="player-stat">
              <span className="player-stat-num">{stats?.gamesPlayed ?? "—"}</span>
              <span className="player-stat-label">Games partaken</span>
            </div>
            <div className="player-stat">
              <span className="player-stat-num">{stats?.gamesWon ?? "—"}</span>
              <span className="player-stat-label">Games won</span>
            </div>
            <div className="player-stat">
              <span className="player-stat-num">{stats?.noShows ?? "—"}</span>
              <span className="player-stat-label">No-shows</span>
            </div>
          </div>

          <div className="player-card">
            <h2>Bio</h2>
            {profile.bio?.trim() ? (
              <p className="player-bio">{profile.bio}</p>
            ) : (
              <p className="player-bio player-bio--empty">
                {isSelf ? (
                  <>
                    You haven't added a bio yet.{" "}
                    <Link to="/profile">Add one</Link>.
                  </>
                ) : (
                  "This player hasn't added a bio yet."
                )}
              </p>
            )}
          </div>

          <div className="player-card">
            <h2>Badges</h2>
            <p className="player-badges-note">
              Badges aren't live yet. Once they are, players will earn them for:
            </p>
            <ul className="player-badges-list">
              {PLANNED_BADGES.map((badge) => (
                <li key={badge}>{badge}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
