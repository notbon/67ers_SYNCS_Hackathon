import { supabase } from "../lib/supabase";

export type Person = {
  id: string;
  name: string;
};

export type FriendRequest = {
  id: string;
  requester: Person;
};

/** Matches the signed-in user is signed up to — one chat room each. */
export async function fetchMyMatches(
  userId: string,
): Promise<{ id: string; title: string; sport: string }[]> {
  const { data, error } = await supabase
    .from("match_participants")
    .select("match:matches ( id, title, sport )")
    .eq("user_id", userId);

  if (error) throw error;

  type Joined = { match: { id: string; title: string; sport: string } | null };
  return ((data ?? []) as unknown as Joined[])
    .map((r) => r.match)
    .filter((m): m is { id: string; title: string; sport: string } => m !== null);
}

/** Accepted friends, in both directions. */
export async function fetchFriends(userId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `requester_id, addressee_id,
       requester:users!friendships_requester_id_fkey ( id, name ),
       addressee:users!friendships_addressee_id_fkey ( id, name )`,
    )
    .eq("status", "accepted");

  if (error) throw error;

  type Row = {
    requester_id: string;
    addressee_id: string;
    requester: Person | Person[] | null;
    addressee: Person | Person[] | null;
  };

  const one = (v: Person | Person[] | null): Person | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  return ((data ?? []) as unknown as Row[])
    .map((r) => (r.requester_id === userId ? one(r.addressee) : one(r.requester)))
    .filter((p): p is Person => p !== null);
}

/**
 * People the user shares a match with. These are messageable even without a
 * friendship, matching the can_message() rule in the database.
 */
export async function fetchCoAttendees(userId: string): Promise<Person[]> {
  const myMatches = await fetchMyMatches(userId);
  if (myMatches.length === 0) return [];

  const { data, error } = await supabase
    .from("match_participants")
    .select("user_id, user:users ( id, name )")
    .in(
      "match_id",
      myMatches.map((m) => m.id),
    )
    .neq("user_id", userId);

  if (error) throw error;

  type Row = { user: Person | Person[] | null };
  const one = (v: Person | Person[] | null): Person | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const seen = new Map<string, Person>();
  ((data ?? []) as unknown as Row[]).forEach((r) => {
    const p = one(r.user);
    if (p) seen.set(p.id, p);
  });

  return [...seen.values()];
}

/** Incoming friend requests awaiting the user's response. */
export async function fetchPendingRequests(
  userId: string,
): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester:users!friendships_requester_id_fkey ( id, name )")
    .eq("status", "pending")
    .eq("addressee_id", userId);

  if (error) throw error;

  type Row = { id: string; requester: Person | Person[] | null };
  const one = (v: Person | Person[] | null): Person | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  return ((data ?? []) as unknown as Row[])
    .map((r) => ({ id: r.id, requester: one(r.requester) }))
    .filter((r): r is FriendRequest => r.requester !== null);
}

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: requesterId, addressee_id: addresseeId });

  // 23505 = already requested; harmless.
  if (error && error.code !== "23505") throw error;
}

export async function acceptFriendRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", id);

  if (error) throw error;
}
