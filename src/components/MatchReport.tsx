import { useEffect, useState } from "react";
import {
  fetchAttendance,
  setAttendance,
  fetchScore,
  saveScore,
  fetchEndorsements,
  addEndorsement,
  fetchFeedback,
  submitFeedback,
  ENDORSEMENT_BADGES,
  type AttendanceMap,
  type MatchScore,
  type Endorsement,
  type Feedback,
} from "../services/matchService";
import type { MatchPlayer } from "../services/matchService";
import Avatar from "./Avatar";
import "./MatchReport.css";

type Props = {
  matchId: string;
  isHost: boolean;
  currentUserId: string | null;
  participants: MatchPlayer[];
};

export default function MatchReport({
  matchId,
  isHost,
  currentUserId,
  participants,
}: Props) {
  const [attendance, setAttendanceMap] = useState<AttendanceMap>({});
  const [score, setScoreState] = useState<MatchScore | null>(null);
  const [teamAInput, setTeamAInput] = useState("");
  const [teamBInput, setTeamBInput] = useState("");
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [feedback, setFeedbackList] = useState<Feedback[]>([]);
  const [endorseTarget, setEndorseTarget] = useState("");
  const [endorseBadge, setEndorseBadge] = useState<string>(ENDORSEMENT_BADGES[0]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchAttendance(matchId),
      fetchScore(matchId),
      fetchEndorsements(matchId),
      fetchFeedback(matchId),
    ])
      .then(([att, sc, end, fb]) => {
        if (cancelled) return;
        setAttendanceMap(att);
        setScoreState(sc);
        setTeamAInput(sc?.team_a_score?.toString() ?? "");
        setTeamBInput(sc?.team_b_score?.toString() ?? "");
        setEndorsements(end);
        setFeedbackList(fb);
      })
      .catch((err) => console.error("Failed to load match report:", err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [matchId]);

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
    try {
      await addEndorsement(matchId, currentUserId, endorseTarget, endorseBadge);
      setEndorsements((prev) => [
        ...prev,
        { id: crypto.randomUUID(), from_user_id: currentUserId, to_user_id: endorseTarget, badge: endorseBadge },
      ]);
      setEndorseTarget("");
    } catch (err) {
      console.error("Failed to add endorsement:", err);
    }
  }

  async function handleFeedbackSubmit() {
    if (!currentUserId || !comment.trim()) return;
    try {
      await submitFeedback(matchId, currentUserId, comment.trim());
      setFeedbackList((prev) => [
        { id: crypto.randomUUID(), user_id: currentUserId, comment: comment.trim(), created_at: new Date().toISOString() },
        ...prev.filter((f) => f.user_id !== currentUserId),
      ]);
      setComment("");
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  }

  function nameFor(userId: string): string {
    return participants.find((p) => p.id === userId)?.name || "Player";
  }

  if (loading) return <p className="match-report-loading">Loading report...</p>;

  return (
    <div className="match-report">
      <h2>Match Report</h2>

      {/* SCORE */}
      <div className="report-section">
        <h3>Score</h3>
        {isHost ? (
          <div className="score-editor">
            <input
              type="number"
              value={teamAInput}
              onChange={(e) => setTeamAInput(e.target.value)}
              placeholder="Team A"
            />
            <span className="score-sep">–</span>
            <input
              type="number"
              value={teamBInput}
              onChange={(e) => setTeamBInput(e.target.value)}
              placeholder="Team B"
            />
            <button onClick={handleScoreSave} disabled={saving}>
              {saving ? "Saving..." : "Save Score"}
            </button>
          </div>
        ) : score?.team_a_score != null ? (
          <p className="score-display">
            {score.team_a_score} – {score.team_b_score}
          </p>
        ) : (
          <p className="report-empty">Score not yet recorded.</p>
        )}
      </div>

      {/* ATTENDANCE */}
      <div className="report-section">
        <h3>Attendance</h3>
        {isHost ? (
          <ul className="attendance-list">
            {participants.map((p) => (
              <li key={p.id} className="attendance-row">
                <Avatar id={p.id} name={p.name} url={p.avatar_url} size={32} />
                <span>{p.name}</span>
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
        ) : (
          <ul className="attendance-list attendance-list--readonly">
            {participants.map((p) => (
              <li key={p.id} className="attendance-row">
                <Avatar id={p.id} name={p.name} url={p.avatar_url} size={32} />
                <span>{p.name}</span>
                <span className={attendance[p.id] ? "attended-yes" : "attended-no"}>
                  {attendance[p.id] ? "Attended" : "Not marked"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ENDORSEMENTS */}
      <div className="report-section">
        <h3>Endorsements</h3>

        {currentUserId && (
          <div className="endorse-form">
            <select value={endorseTarget} onChange={(e) => setEndorseTarget(e.target.value)}>
              <option value="">Choose a player</option>
              {participants
                .filter((p) => p.id !== currentUserId)
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
            <select value={endorseBadge} onChange={(e) => setEndorseBadge(e.target.value)}>
              {ENDORSEMENT_BADGES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <button onClick={handleEndorse} disabled={!endorseTarget}>
              Endorse
            </button>
          </div>
        )}

        {endorsements.length === 0 ? (
          <p className="report-empty">No endorsements yet.</p>
        ) : (
          <ul className="endorsement-list">
            {participants.map((p) => {
              const badges = endorsements.filter((e) => e.to_user_id === p.id);
              if (badges.length === 0) return null;
              return (
                <li key={p.id} className="endorsement-row">
                  <span className="endorsement-name">{p.name}</span>
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

      {/* FEEDBACK */}
      <div className="report-section">
        <h3>Feedback</h3>

        {currentUserId && (
          <div className="feedback-form">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How did the match go?"
              rows={3}
            />
            <button onClick={handleFeedbackSubmit} disabled={!comment.trim()}>
              Submit Feedback
            </button>
          </div>
        )}

        {feedback.length === 0 ? (
          <p className="report-empty">No feedback yet.</p>
        ) : (
          <ul className="feedback-list">
            {feedback.map((f) => (
              <li key={f.id} className="feedback-row">
                <span className="feedback-author">{nameFor(f.user_id)}</span>
                <p>{f.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}