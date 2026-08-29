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
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
      </div>
    </div>
  );
}