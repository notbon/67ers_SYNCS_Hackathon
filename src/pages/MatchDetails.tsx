import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./MatchDetails.css";

type Match = {
  id: string;
  title: string;
  sport: string;
  location: string;
  match_date: string;
  match_time: string;
  max_players: number;
  skill_level: string;
  description: string | null;
  created_by: string | null;
};

export default function MatchDetails() {
  const { id } = useParams<{ id: string }>();

  const [match, setMatch] = useState<Match | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [joinStatus, setJoinStatus] = useState<
    "pending" | "approved" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);

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
          .eq("match_id", id)
          .eq("status", "approved");

        if (countError) {
          throw countError;
        }

        setParticipantCount(count ?? 0);

        // Find currently logged-in user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: participant } = await supabase
            .from("match_participants")
            .select("status")
            .eq("match_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

          setJoinStatus(
            participant?.status === "pending" ||
            participant?.status === "approved"
              ? participant.status
              : null
          );
          const { data: stats } = await supabase
            .from("user_sport_stats")
            .select("games_played")
            .eq("user_id", user.id)
            .eq("sport", matchData.sport)
            .maybeSingle();

          setGamesPlayed(stats?.games_played ?? 0);
        }
      } catch (error) {
        console.error("Error loading match:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMatch();
  }, [id]);

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

      const status =
        match.skill_level === "Advanced" && gamesPlayed < 5
          ? "pending"
          : "approved";

      const { error } = await supabase
        .from("match_participants")
        .insert({
          match_id: id,
          user_id: user.id,
          status,
        });

      if (error) {
        throw error;
      }

      setJoinStatus(status);

      if (status === "approved") {
        setParticipantCount((count) => count + 1);
      }
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

      if (joinStatus === "approved") {
        setParticipantCount((count) => Math.max(count - 1, 0));
      }

      setJoinStatus(null);
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
        <div className="match-details-header">
          <p className="match-sport">{match.sport}</p>

          <h1>{match.title}</h1>

          <span className="skill-level">
            {match.skill_level}
          </span>
        </div>

        <div className="match-info">
          <div className="match-info-item">
            <span className="info-label">Location</span>
            <span>{match.location}</span>
          </div>

          <div className="match-info-item">
            <span className="info-label">Date</span>
            <span>
              {new Date(match.match_date).toLocaleDateString()}
            </span>
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

          <p>
            {match.description ||
              "No description has been provided."}
          </p>
        </div>

        {joinStatus === "approved" ? (
      <button
        className="leave-match-button"
        onClick={handleLeave}
        disabled={actionLoading}
      >
        {actionLoading ? "Leaving..." : "Leave Match"}
      </button>
    ) : joinStatus === "pending" ? (
      <button
        className="leave-match-button"
        onClick={handleLeave}
        disabled={actionLoading}
      >
        {actionLoading ? "Cancelling..." : "Request Pending"}
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
            : match.skill_level === "Advanced" && gamesPlayed < 5
              ? "Request to Join"
              : "Join Match"}
      </button>
    )}
      </div>
    </div>
  );
}