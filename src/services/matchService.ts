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