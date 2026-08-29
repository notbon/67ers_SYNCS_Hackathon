import { supabase } from "../lib/supabase";
import type { MatchHost } from "../types";
import type { PlayerToken } from "../lib/playerToken";

// Whatever `select("*")` gives us back from `users`. `avatar_url` isn't in the
// initial schema yet — it's read optionally so a later migration that adds a
// profile photo column starts working with no code change here.
type UserRow = {
  id: string;
  name: string | null;
  avatar_url?: string | null;
};

/**
 * Resolve host profiles for a batch of player tokens (match `created_by`
 * values) in one round trip. Returns a Map keyed by token so callers can
 * attach a host to each match without an N+1 query. Unknown, null and blank
 * tokens are skipped; tokens with no matching user are simply absent.
 *
 * Host info is decorative, so any failure resolves to an empty Map rather than
 * throwing — the match list must still render.
 */
export async function fetchHostsByToken(
  tokens: Array<PlayerToken | null | undefined>,
): Promise<Map<PlayerToken, MatchHost>> {
  const hosts = new Map<PlayerToken, MatchHost>();

  const unique = Array.from(
    new Set(
      tokens.filter(
        (token): token is PlayerToken =>
          typeof token === "string" && token.length > 0,
      ),
    ),
  );
  if (unique.length === 0) return hosts;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("id", unique);

  if (error) {
    console.error("Failed to load match hosts:", error);
    return hosts;
  }

  for (const row of (data ?? []) as UserRow[]) {
    hosts.set(row.id, {
      id: row.id,
      display_name: row.name?.trim() || null,
      avatar_url: row.avatar_url ?? null,
    });
  }

  return hosts;
}
