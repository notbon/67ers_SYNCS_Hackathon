import type { Match } from "../types";

/**
 * A **player token** uniquely identifies a signed-in player. It's the value
 * that gets stamped onto `matches.created_by` when someone hosts a match, and
 * onto `match_participants.user_id` when someone joins one — in both cases a
 * `users.id` UUID.
 *
 * Auth isn't wired up yet, so the only tokens in the system today are the
 * `created_by` UUIDs already sitting on seeded matches. Routing every "who is
 * this player?" question through this module means the real lookup (Supabase
 * session / magic link / whatever we land on) only has to be dropped in here.
 */
export type PlayerToken = string;

/** The player token of whoever created this match, or null if it predates auth. */
export function getHostToken(
  match: Pick<Match, "created_by">,
): PlayerToken | null {
  return match.created_by ?? null;
}

/**
 * The player token for the current session. Always null until sign-in exists;
 * callers are expected to handle the logged-out case already.
 */
export function getCurrentPlayerToken(): PlayerToken | null {
  // TODO(auth): return the Supabase session user id once login is implemented.
  return null;
}

/** Whether `token` belongs to the player using the app right now. */
export function isCurrentPlayer(token: PlayerToken | null): boolean {
  const current = getCurrentPlayerToken();
  return current !== null && current === token;
}
