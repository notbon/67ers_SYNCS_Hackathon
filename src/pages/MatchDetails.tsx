import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  fetchParticipants,
  type MatchPlayer,
} from "../services/matchService";
import Avatar from "../components/Avatar";
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

  const [participants, setParticipants] =
    useState<MatchPlayer[]>([]);

  const [participantCount, setParticipantCount] =
    useState(0);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [joinStatus, setJoinStatus] = useState<
    "pending" | "approved" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [gamesPlayed, setGamesPlayed] =
    useState(0);

  const [pendingRequests, setPendingRequests] = useState<
    {
      user_id: string;
      name: string;
      games_played: number;
    }[]
  >([]);

  /*
   * Uses the exact same roster system as MatchBrowse.
   *
   * fetchParticipants() returns:
   *
   * Map<
   *   match_id,
   *   MatchPlayer[]
   * >
   */
  const loadParticipants = useCallback(
    async (matchId: string) => {
      try {
        const rosters =
          await fetchParticipants([matchId]);

        const players =
          rosters.get(matchId) ?? [];

        setParticipants(players);
        setParticipantCount(players.length);
      } catch (error) {
        console.error(
          "Failed to load match roster:",
          error
        );

        setParticipants([]);
      }
    },
    []
  );

  useEffect(() => {
    async function loadMatch() {
      if (!id) {
        return;
      }

      try {
        setLoading(true);

        /*
         * Load match information.
         */
        const {
          data: matchData,
          error: matchError,
        } = await supabase
          .from("matches")
          .select("*")
          .eq("id", id)
          .single();

        if (matchError) {
          throw matchError;
        }

        setMatch(matchData);

        /*
         * Get logged-in user.
         */
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setCurrentUserId(
          user?.id ?? null
        );

        /*
         * Load roster using the same system
         * as MatchBrowse.
         */
        await loadParticipants(id);

        if (user) {
          /*
           * Check whether current user is
           * pending or approved.
           */
          const {
            data: participant,
            error: participantError,
          } = await supabase
            .from("match_participants")
            .select("status")
            .eq("match_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (participantError) {
            console.error(
              "Failed to load join status:",
              participantError
            );
          }

          setJoinStatus(
            participant?.status === "pending" ||
              participant?.status ===
                "approved"
              ? participant.status
              : null
          );

          /*
           * Get games played for Advanced
           * match requirements.
           */
          const {
            data: stats,
            error: statsError,
          } = await supabase
            .from("user_sport_stats")
            .select("games_played")
            .eq("user_id", user.id)
            .eq(
              "sport",
              matchData.sport
            )
            .maybeSingle();

          if (statsError) {
            console.error(
              "Failed to load sport stats:",
              statsError
            );
          }

          setGamesPlayed(
            stats?.games_played ?? 0
          );

          // If the current user is the host, get pending join requests
          if (matchData.created_by === user.id) {
            const { data: requests, error: requestsError } = await supabase
              .from("match_participants")
              .select(`
                user_id,
                users (
                  name
                )
              `)
              .eq("match_id", id)
              .eq("status", "pending");

            if (requestsError) {
              throw requestsError;
            }

            const formattedRequests = await Promise.all(
            (requests ?? []).map(async (request: any) => {
              const { data: playerStats } = await supabase
                .from("user_sport_stats")
                .select("games_played")
                .eq("user_id", request.user_id)
                .eq("sport", matchData.sport)
                .maybeSingle();

              return {
                user_id: request.user_id,
                name: request.users?.name ?? "Player",
                games_played: playerStats?.games_played ?? 0,
              };
            })
          );

          setPendingRequests(formattedRequests);
          }
        }
      } catch (error) {
        console.error(
          "Error loading match:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadMatch();
  }, [id, loadParticipants]);

  async function handleJoin() {
    if (!id || !match) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert(
        "You need to log in before joining a match."
      );

      return;
    }

    if (
      participantCount >=
      match.max_players
    ) {
      alert(
        "This match is already full."
      );

      return;
    }

    try {
      setActionLoading(true);

      /*
       * Advanced matches require approval
       * if the player has fewer than
       * five games.
       */
      const status =
        match.skill_level ===
          "Advanced" &&
        gamesPlayed < 5
          ? "pending"
          : "approved";

      const { error } = await supabase
        .from("match_participants")
        .upsert(
          {
            match_id: id,
            user_id: user.id,
            status,
          },
          {
            onConflict: "match_id,user_id",
          }
        );

      if (error) {
        throw error;
      }

      setJoinStatus(status);

      /*
       * If they were approved immediately,
       * refresh the roster so they appear.
       */
      if (status === "approved") {
        await loadParticipants(id);
      }
    } catch (error) {
      console.error(
        "Error joining match:",
        error
      );

      alert(
        "Could not join match."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove(userId: string) {
  if (!id || !match) return;

  // Don't approve someone if the match filled up
  if (participantCount >= match.max_players) {
    alert("This match is already full.");
    return;
  }

  try {
    setActionLoading(true);

    const { error } = await supabase
      .from("match_participants")
      .update({
        status: "approved",
      })
      .eq("match_id", id)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    // Remove them from the pending requests section
    setPendingRequests((requests) =>
      requests.filter(
        (request) => request.user_id !== userId
      )
    );

    // Reload player roster
    await loadParticipants(id);
  } catch (error) {
    console.error("Error approving player:", error);
    alert("Could not approve player.");
  } finally {
    setActionLoading(false);
  }
}

async function handleReject(userId: string) {
  if (!id) return;

  try {
    setActionLoading(true);

    const { error } = await supabase
      .from("match_participants")
      .update({
        status: "rejected",
      })
      .eq("match_id", id)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    setPendingRequests((requests) =>
      requests.filter(
        (request) => request.user_id !== userId
      )
    );
  } catch (error) {
    console.error("Error rejecting player:", error);
    alert("Could not reject player.");
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

      setJoinStatus(null);

      /*
       * Reload the exact roster after
       * removing this player.
       */
      await loadParticipants(id);
    } catch (error) {
      console.error(
        "Error leaving match:",
        error
      );

      alert(
        "Could not leave match."
      );
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

          <p>
            This match may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const matchFull =
    participantCount >=
    match.max_players;

  return (
    <div className="match-details-page">
      <div className="match-details-card">

        <div className="match-details-header">
          <p className="match-sport">
            {match.sport}
          </p>

          <h1>
            {match.title}
          </h1>

          <span className="skill-level">
            {match.skill_level}
          </span>
        </div>

        <div className="match-info">

          <div className="match-info-item">
            <span className="info-label">
              Location
            </span>

            <span>
              {match.location}
            </span>
          </div>

          <div className="match-info-item">
            <span className="info-label">
              Date
            </span>

            <span>
              {new Date(
                match.match_date
              ).toLocaleDateString()}
            </span>
          </div>

          <div className="match-info-item">
            <span className="info-label">
              Time
            </span>

            <span>
              {match.match_time}
            </span>
          </div>

          <div className="match-info-item">
            <span className="info-label">
              Players
            </span>

            <span>
              {participantCount} /{" "}
              {match.max_players}
            </span>
          </div>

        </div>

        {/* PLAYER ROSTER */}
        <div className="match-participants">

          <div className="participants-heading">
            <h2>
              Players Joined
            </h2>

            <span className="participants-count">
              {participantCount} /{" "}
              {match.max_players}
            </span>
          </div>

          {participants.length === 0 ? (
            <p className="participants-empty">
              No players have joined yet.
            </p>
          ) : (
            <div className="participant-list">

              {participants.map(
                (player) => (
                  <div
                    key={player.id}
                    className="participant-card"
                  >

                    <Avatar
                      id={player.id}
                      name={player.name}
                      url={player.avatar_url}
                      size={50}
                      className="participant-avatar-image"
                    />

                    <div className="participant-details">

                      <div className="participant-name">

                        <span>
                          {player.name ||
                            "Player"}
                        </span>

                        {player.id ===
                          currentUserId && (
                          <span className="you-label">
                            You
                          </span>
                        )}

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

        {match.created_by === currentUserId && pendingRequests.length > 0 && (
        <div className="join-requests">
          <div className="participants-heading">
            <h2>Join Requests</h2>

            <span className="participants-count">
              {pendingRequests.length} pending
            </span>
          </div>

          <div className="participant-list">
            {pendingRequests.map((request) => (
              <div
                key={request.user_id}
                className="participant-card"
              >
                <div className="participant-details">
                  <div className="participant-name">
                    <span>{request.name}</span>
                  </div>

                  <span>
                    {request.games_played} {match.sport} games played
                  </span>
                </div>

                <div className="request-actions">
                  <button
                    type="button"
                    onClick={() => handleApprove(request.user_id)}
                    disabled={actionLoading || matchFull}
                  >
                    {matchFull ? "Match Full" : "Approve"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(request.user_id)}
                    disabled={actionLoading}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="match-description">

          <h2>
            About this match
          </h2>

          <p>
            {match.description ||
              "No description has been provided."}
          </p>

        </div>

        {joinStatus === "pending" && (
          <div className="pending-message">
            Your request is waiting
            for approval.
          </div>
        )}

        {joinStatus === "approved" ? (
          <button
            className="leave-match-button"
            onClick={handleLeave}
            disabled={actionLoading}
          >
            {actionLoading
              ? "Leaving..."
              : "Leave Match"}
          </button>
        ) : joinStatus === "pending" ? (
          <button
            className="leave-match-button"
            onClick={handleLeave}
            disabled={actionLoading}
          >
            {actionLoading
              ? "Cancelling..."
              : "Cancel Request"}
          </button>
        ) : (
          <button
            className="join-match-button"
            onClick={handleJoin}
            disabled={
              actionLoading ||
              matchFull
            }
          >
            {matchFull
              ? "Match Full"
              : actionLoading
                ? "Joining..."
                : match.skill_level ===
                      "Advanced" &&
                    gamesPlayed < 5
                  ? "Request to Join"
                  : "Join Match"}
          </button>
        )}

      </div>
    </div>
  );
}