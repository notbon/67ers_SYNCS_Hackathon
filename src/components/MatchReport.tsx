import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAttendance,
  setAttendance,
  fetchScore,
  saveScore,
  fetchEndorsements,
  addEndorsement,
  fetchFeedback,
  submitFeedback,
  fetchTeams,
  setPlayerTeam,
  autoAssignTeams,
  ENDORSEMENT_BADGES,
  type AttendanceMap,
  type MatchScore,
  type Endorsement,
  type Feedback,
  type TeamAssignment,
} from "../services/matchService";
import type { MatchPlayer } from "../services/matchService";
import Avatar from "./Avatar";
import "./MatchReport.css";

type Props = {
  matchId: string;
  /** Host: can submit the report (teams, score, attendance). */
  canManage: boolean;
  /** Host or approved player: can endorse / report / give feedback. */
  canParticipate: boolean;
  currentUserId: string | null;
  participants: MatchPlayer[];
};

export default function MatchReport({
  matchId,
  canManage,
  canParticipate,
  currentUserId,
  participants,
}: Props) {
  const [attendance, setAttendanceMap] = useState<AttendanceMap>({});
  // Score value isn't rendered (host edits via the inputs below); the setter is
  // kept for the optimistic update after saving.
  const [, setScoreState] = useState<MatchScore | null>(null);
  const [teamAInput, setTeamAInput] = useState("");
  const [teamBInput, setTeamBInput] = useState("");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [feedback, setFeedbackList] = useState<Feedback[]>([]);
  const [endorseTarget, setEndorseTarget] = useState("");
  const [endorseBadge, setEndorseBadge] = useState<string>(ENDORSEMENT_BADGES[0]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState<TeamAssignment>({});
  const [teamsSaving, setTeamsSaving] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [endorseSubmitting, setEndorseSubmitting] = useState(false);
  const [endorseError, setEndorseError] = useState<string | null>(null);
  const [endorseSuccess, setEndorseSuccess] = useState(false);

  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);


  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [att, sc, end, fb, tm] = await Promise.all([
          fetchAttendance(matchId),
          fetchScore(matchId),
          fetchEndorsements(matchId),
          fetchFeedback(matchId),
          fetchTeams(matchId),
        ]);

        if (cancelled) return;

        setAttendanceMap(att);
        setScoreState(sc);
        setTeamAInput(sc?.team_a_score?.toString() ?? "");
        setTeamBInput(sc?.team_b_score?.toString() ?? "");
        setEndorsements(end);
        setFeedbackList(fb);

        // Every player must be on a team. If nobody's been assigned yet and
        // the host is viewing, auto-split evenly right away; the host can
        // still adjust individuals or reshuffle afterward.
        if (
          canManage &&
          Object.keys(tm).length === 0 &&
          participants.length > 0
        ) {
          await autoAssignTeams(matchId, participants.map((p) => p.id));
          const refreshed = await fetchTeams(matchId);
          if (!cancelled) setTeams(refreshed);
        } else if (!cancelled) {
          setTeams(tm);
        }
      } catch (err) {
        console.error("Failed to load match report:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function handleTeamChange(userId: string, team: "A" | "B") {
    setTeamsSaving(true);
    setTeamsError(null);
    try {
      await setPlayerTeam(matchId, userId, team);
      setTeams((prev) => ({ ...prev, [userId]: team }));
    } catch (err) {
      setTeamsError((err as Error).message);
    } finally {
      setTeamsSaving(false);
    }
  }

  async function handleReshuffle() {
    setTeamsSaving(true);
    setTeamsError(null);
    try {
      await autoAssignTeams(matchId, participants.map((p) => p.id));
      const refreshed = await fetchTeams(matchId);
      setTeams(refreshed);
    } catch (err) {
      setTeamsError((err as Error).message);
    } finally {
      setTeamsSaving(false);
    }
  }

  async function handleAttendanceToggle(userId: string, attended: boolean) {
    if (!currentUserId) return;
    setAttendanceMap((prev) => ({ ...prev, [userId]: attended }));
    try {
      await setAttendance(matchId, userId, attended, currentUserId);
    } catch (err) {
      console.error("Failed to save attendance:", err);
    }
  }

  async function handleScoreSave() {
    if (!currentUserId) return;
    const a = Number(teamAInput);
    const b = Number(teamBInput);
    if (Number.isNaN(a) || Number.isNaN(b)) return;
    setSaving(true);
    try {
      await saveScore(matchId, a, b, currentUserId);
      setScoreState({ team_a_score: a, team_b_score: b });
    } catch (err) {
      console.error("Failed to save score:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleEndorse() {
    if (!currentUserId || !endorseTarget) return;
    setEndorseSubmitting(true);
    setEndorseError(null);
    setEndorseSuccess(false);
    try {
      await addEndorsement(matchId, currentUserId, endorseTarget, endorseBadge);
      setEndorsements((prev) => [
        ...prev,
        { id: crypto.randomUUID(), from_user_id: currentUserId, to_user_id: endorseTarget, badge: endorseBadge },
      ]);
      setEndorseTarget("");
      setEndorseSuccess(true);
    } catch (err) {
      setEndorseError((err as Error).message);
    } finally {
      setEndorseSubmitting(false);
    }
  }

  async function handleFeedbackSubmit() {
    if (!currentUserId || !comment.trim()) return;
    setFeedbackSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(false);
    try {
      await submitFeedback(matchId, currentUserId, comment.trim());
      setFeedbackList((prev) => [
        { id: crypto.randomUUID(), user_id: currentUserId, comment: comment.trim(), created_at: new Date().toISOString() },
        ...prev.filter((f) => f.user_id !== currentUserId),
      ]);
      setComment("");
      setFeedbackSuccess(true);
    } catch (err) {
      setFeedbackError((err as Error).message);
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  function nameFor(userId: string): string {
    return participants.find((p) => p.id === userId)?.name || "Player";
  }

  const others = participants.filter((p) => p.id !== currentUserId);

  if (loading) return <p className="match-report-loading">Loading report...</p>;

  return (
    <div className="match-report">
      <h2>{canManage ? "Match Report" : "After the Match"}</h2>

      {/* TEAMS / SCORE / ATTENDANCE — host only */}
      {canManage && (
        <>
          <div className="report-section">
            <div className="teams-heading">
              <h3>Teams</h3>
              <button
                type="button"
                className="team-reshuffle-button"
                onClick={handleReshuffle}
                disabled={teamsSaving || participants.length === 0}
              >
                {teamsSaving ? "Assigning..." : "Reshuffle Teams"}
              </button>
            </div>

            {teamsError && <p className="report-error">{teamsError}</p>}

            {participants.length === 0 ? (
              <p className="report-empty">No players to assign yet.</p>
            ) : (
              <ul className="team-roster">
                {participants.map((p) => (
                  <li key={p.id} className="team-roster-row">
                    <Avatar id={p.id} name={p.name} url={p.avatar_url} size={32} />
                    <Link to={`/players/${p.id}`} className="team-roster-name">
                      {p.name}
                    </Link>
                    <select
                      value={teams[p.id] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "A" || value === "B") handleTeamChange(p.id, value);
                      }}
                      disabled={teamsSaving}
                    >
                      <option value="">Unassigned</option>
                      <option value="A">Team A</option>
                      <option value="B">Team B</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="report-section">
            <h3>Score</h3>
            <div className="score-editor">
              <span className="score-team-label">Team A</span>
              <input
                type="number"
                value={teamAInput}
                onChange={(e) => setTeamAInput(e.target.value)}
                placeholder="0"
              />
              <span className="score-sep">–</span>
              <input
                type="number"
                value={teamBInput}
                onChange={(e) => setTeamBInput(e.target.value)}
                placeholder="0"
              />
              <span className="score-team-label">Team B</span>
              <button onClick={handleScoreSave} disabled={saving}>
                {saving ? "Saving..." : "Save Score"}
              </button>
            </div>
          </div>

          <div className="report-section">
            <h3>Attendance</h3>
            <ul className="attendance-list">
              {participants.map((p) => (
                <li key={p.id} className="attendance-row">
                  <Avatar id={p.id} name={p.name} url={p.avatar_url} size={32} />
                  <Link to={`/players/${p.id}`}>{p.name}</Link>
                  <label className="attendance-toggle">
                    <input
                      type="checkbox"
                      checked={attendance[p.id] ?? false}
                      onChange={(e) => handleAttendanceToggle(p.id, e.target.checked)}
                    />
                    Attended
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* ENDORSEMENTS — every player in the match */}
      <div className="report-section">
        <h3>Endorsements</h3>

        {canParticipate && (
          <div className="endorse-form">
            <select
              value={endorseTarget}
              onChange={(e) => { setEndorseTarget(e.target.value); setEndorseSuccess(false); }}
            >
              <option value="">Choose a player</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={endorseBadge}
              onChange={(e) => { setEndorseBadge(e.target.value); setEndorseSuccess(false); }}
            >
              {ENDORSEMENT_BADGES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <button onClick={handleEndorse} disabled={!endorseTarget || endorseSubmitting}>
              {endorseSubmitting ? "Sending..." : "Endorse"}
            </button>
          </div>
        )}

        {endorseError && <p className="report-error">{endorseError}</p>}
        {endorseSuccess && !endorseError && <p className="report-success">Endorsement sent!</p>}

        {endorsements.length === 0 ? (
          <p className="report-empty">No endorsements yet.</p>
        ) : (
          <ul className="endorsement-list">
            {participants.map((p) => {
              const badges = endorsements.filter((e) => e.to_user_id === p.id);
              if (badges.length === 0) return null;
              return (
                <li key={p.id} className="endorsement-row">
                  <Link to={`/players/${p.id}`} className="endorsement-name">{p.name}</Link>
                  <span className="endorsement-badges">
                    {badges.map((b) => (
                      <span key={b.id} className="badge-pill">{b.badge}</span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Player reporting lives on the "Players Joined" roster (MatchDetails). */}

      {/* FEEDBACK — every player in the match */}
      <div className="report-section">
        <h3>Feedback</h3>

        {canParticipate && (
          <div className="feedback-form">
            <textarea
              value={comment}
              onChange={(e) => { setComment(e.target.value); setFeedbackSuccess(false); }}
              placeholder="How did the match go?"
              rows={3}
            />
            <button onClick={handleFeedbackSubmit} disabled={!comment.trim() || feedbackSubmitting}>
              {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
            </button>
            {feedbackError && <p className="report-error">{feedbackError}</p>}
            {feedbackSuccess && !feedbackError && <p className="report-success">Feedback submitted!</p>}
          </div>
        )}

        {feedback.length === 0 ? (
          <p className="report-empty">No feedback yet.</p>
        ) : (
          <ul className="feedback-list">
            {feedback.map((f) => (
              <li key={f.id} className="feedback-row">
                <Link to={`/players/${f.user_id}`} className="feedback-author">
                  {nameFor(f.user_id)}
                </Link>
                <p>{f.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
