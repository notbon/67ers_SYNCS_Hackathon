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

/**
 * How many players have signed up to each of the given matches.
 * Returns a Map keyed by match id; matches with nobody signed up are absent.
 *
 * Roster counts are decorative — a failure resolves to an empty Map so the
 * match list still renders.
 */
export async function fetchParticipantCounts(
  matchIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (matchIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("match_participants")
    .select("match_id")
    .in("match_id", matchIds);

  if (error) {
    console.error("Failed to load roster counts:", error);
    return counts;
  }

  ((data ?? []) as { match_id: string }[]).forEach((row) => {
    counts.set(row.match_id, (counts.get(row.match_id) ?? 0) + 1);
  });

  return counts;
}
