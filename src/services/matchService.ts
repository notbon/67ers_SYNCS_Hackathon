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

export type MatchPlayer = { id: string; name: string };

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
    .select("match_id, user:users ( id, name )")
    .in("match_id", matchIds);

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
