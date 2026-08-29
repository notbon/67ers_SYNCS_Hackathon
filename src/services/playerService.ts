import { supabase } from "../lib/supabase";
import { fetchWinLossRecord } from "./matchService";
import type { PublicProfile, PlayerStats } from "../types";

/**
 * The public-facing profile row for any player. Deliberately does NOT select
 * `email` — that stays private to the account owner's own Profile page.
 */
export async function fetchPublicProfile(
  userId: string,
): Promise<PublicProfile | null> {
  // `select("*")` rather than naming columns so the query still works before
  // `bio` (supabase/20260830_add_bio.sql) has been applied — a missing column
  // just comes back undefined instead of erroring the whole request.
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    skill_level: data.skill_level ?? null,
    avatar_url: data.avatar_url ?? null,
    bio: data.bio ?? null,
  };
}

/**
 * Games partaken / won / no-shows for a player, each derived from an existing
 * table so nothing can drift:
 *   - gamesPlayed : approved rows in match_participants
 *   - gamesWon    : fetchWinLossRecord (match_participants.team + match_scores)
 *   - noShows     : match_attendance rows explicitly marked attended = false
 *
 * Each count is independent and falls back to 0 if its table/query fails, so a
 * partially-migrated database still renders a profile.
 */
export async function fetchPlayerStats(userId: string): Promise<PlayerStats> {
  const [gamesPlayed, record, noShows] = await Promise.all([
    countApprovedParticipations(userId),
    fetchWinLossRecord(userId).catch((err) => {
      console.error("Failed to load win/loss record:", err);
      return { wins: 0, losses: 0, draws: 0 };
    }),
    countNoShows(userId),
  ]);

  return { gamesPlayed, gamesWon: record.wins, noShows };
}

async function countApprovedParticipations(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("match_participants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "approved");

  if (error) {
    console.error("Failed to count games played:", error);
    return 0;
  }
  return count ?? 0;
}

async function countNoShows(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("match_attendance")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("attended", false);

  if (error) {
    console.error("Failed to count no-shows:", error);
    return 0;
  }
  return count ?? 0;
}
