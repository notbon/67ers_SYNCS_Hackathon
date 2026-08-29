import { supabase } from "../lib/supabase";
import type { Match } from "../types";

export type CreateMatchInput = {
  title: string;
  sport: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  match_date: string;
  match_time: string;
  max_players: number;
  skill_level: string;
  description: string;
  created_by: string | null;
};

export async function createMatch(match: CreateMatchInput) {
  const { data, error } = await supabase
    .from("matches")
    .insert(match)
    .select();

  if (error) {
    throw error;
  }

  return data;
}

// Fields a host is allowed to change after a match exists. Sport and the
// geo coordinates are intentionally left out — those are set once at creation.
export type UpdateMatchInput = {
  title: string;
  skill_level: string | null;
  match_time: string;
  location: string;
  match_date: string;
  max_players: number;
  description: string | null;
};

/**
 * Update an existing match. The `.eq("created_by", hostId)` guard means only
 * the match's host can write, regardless of how permissive RLS is — a mismatch
 * updates zero rows and `.single()` then throws, which the caller surfaces as
 * "only the host can edit".
 */
export async function updateMatch(
  matchId: string,
  hostId: string,
  updates: UpdateMatchInput,
): Promise<Match> {
  const { data, error } = await supabase
    .from("matches")
    .update(updates)
    .eq("id", matchId)
    .eq("created_by", hostId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Match;
}

/**
 * Fetch every match, ordered soonest-first. Filtering/searching (location,
 * time, skill level, sport, date) happens client-side in the Browse page so
 * we can do fuzzy location matching the database can't express cheaply.
 */
export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true })
    .order("match_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Match[];
}

export type MatchPlayer = { id: string; name: string; avatar_url?: string | null };

/**
 * Who has signed up to each of the given matches, batched into one round trip.
 * Returns a Map keyed by match id. Used to show faces on the match cards
 * rather than just a count — the roster count is this list's length.
 *
 * Decorative, so a failure resolves to an empty Map and the list still renders.
 */
export async function fetchParticipants(
  matchIds: string[],
): Promise<Map<string, MatchPlayer[]>> {
  const byMatch = new Map<string, MatchPlayer[]>();
  if (matchIds.length === 0) return byMatch;

const { data, error } = await supabase
  .from("match_participants")
  .select("match_id, user:users ( id, name, avatar_url )")
  .in("match_id", matchIds)
  .eq("status", "approved");

  if (error) {
    console.error("Failed to load rosters:", error);
    return byMatch;
  }

  type Row = { match_id: string; user: MatchPlayer | MatchPlayer[] | null };

  ((data ?? []) as unknown as Row[]).forEach((row) => {
    const person = Array.isArray(row.user) ? row.user[0] : row.user;
    if (!person) return;
    const list = byMatch.get(row.match_id) ?? [];
    list.push(person);
    byMatch.set(row.match_id, list);
  });

  return byMatch;
}

export type AttendanceMap = Record<string, boolean>; // user_id -> attended

export async function fetchAttendance(matchId: string): Promise<AttendanceMap> {
  const { data, error } = await supabase
    .from("match_attendance")
    .select("user_id, attended")
    .eq("match_id", matchId);
  if (error) throw error;
  const map: AttendanceMap = {};
  (data ?? []).forEach((row) => { map[row.user_id] = row.attended; });
  return map;
}

export async function setAttendance(
  matchId: string,
  userId: string,
  attended: boolean,
  markedBy: string
) {
  const { error } = await supabase.from("match_attendance").upsert({
    match_id: matchId,
    user_id: userId,
    attended,
    marked_by: markedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export type MatchScore = { team_a_score: number | null; team_b_score: number | null };

export async function fetchScore(matchId: string): Promise<MatchScore | null> {
  const { data, error } = await supabase
    .from("match_scores")
    .select("team_a_score, team_b_score")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveScore(
  matchId: string,
  teamAScore: number,
  teamBScore: number,
  setBy: string
) {
  const { error } = await supabase.from("match_scores").upsert({
    match_id: matchId,
    team_a_score: teamAScore,
    team_b_score: teamBScore,
    set_by: setBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export const ENDORSEMENT_BADGES = [
  "MVP",
  "Good Sport",
  "Team Player",
  "Most Improved",
  "Great Communication",
] as const;
export type EndorsementBadge = (typeof ENDORSEMENT_BADGES)[number];

export type Endorsement = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  badge: string;
};

export async function fetchEndorsements(matchId: string): Promise<Endorsement[]> {
  const { data, error } = await supabase
    .from("match_endorsements")
    .select("id, from_user_id, to_user_id, badge")
    .eq("match_id", matchId);
  if (error) throw error;
  return data ?? [];
}

export async function addEndorsement(
  matchId: string,
  fromUserId: string,
  toUserId: string,
  badge: string
) {
  const { error } = await supabase.from("match_endorsements").insert({
    match_id: matchId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    badge,
  });
  // 23505 = duplicate endorsement (same badge, same pair) — ignore, don't throw.
  if (error && error.code !== "23505") throw error;
}

export type Feedback = {
  id: string;
  user_id: string;
  comment: string | null;
  created_at: string;
};

export async function fetchFeedback(matchId: string): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from("match_feedback")
    .select("id, user_id, comment, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function submitFeedback(matchId: string, userId: string, comment: string) {
  const { error } = await supabase
    .from("match_feedback")
    .upsert(
      { match_id: matchId, user_id: userId, comment },
      { onConflict: "match_id,user_id" }
    );
  if (error) throw error;
}

export async function fetchBadgeCounts(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("match_endorsements")
    .select("badge")
    .eq("to_user_id", userId);

  if (error) throw error;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    counts[row.badge] = (counts[row.badge] ?? 0) + 1;
  });
  return counts;
}

