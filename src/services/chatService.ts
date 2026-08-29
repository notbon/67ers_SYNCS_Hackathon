import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ChatScope = "public" | "match" | "direct";

export type ChatMessage = {
  id: string;
  scope: ChatScope;
  match_id: string | null;
  recipient_id: string | null;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  body: string;
  created_at: string;
};

/** Identifies which conversation is on screen. */
export type Conversation =
  | { scope: "public" }
  | { scope: "match"; matchId: string }
  | { scope: "direct"; userId: string };

type Row = {
  id: string;
  scope: ChatScope;
  match_id: string | null;
  recipient_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: SenderRow | SenderRow[] | null;
};

type SenderRow = { name: string; avatar_url: string | null };

function sender(row: Row): SenderRow | null {
  const s = row.sender;
  if (!s) return null;
  return Array.isArray(s) ? (s[0] ?? null) : s;
}

function toMessage(row: Row): ChatMessage {
  return {
    id: row.id,
    scope: row.scope,
    match_id: row.match_id,
    recipient_id: row.recipient_id,
    sender_id: row.sender_id,
    sender_name: sender(row)?.name ?? "Unknown",
    sender_avatar: sender(row)?.avatar_url ?? null,
    body: row.body,
    created_at: row.created_at,
  };
}

const SELECT = `
  id, scope, match_id, recipient_id, sender_id, body, created_at,
  sender:users!messages_sender_id_fkey ( name, avatar_url )
`;

/** Most recent messages for a conversation, oldest first. */
export async function fetchMessages(
  conversation: Conversation,
  viewerId: string,
  limit = 60,
): Promise<ChatMessage[]> {
  let query = supabase.from("messages").select(SELECT);

  if (conversation.scope === "public") {
    query = query.eq("scope", "public");
  } else if (conversation.scope === "match") {
    query = query.eq("scope", "match").eq("match_id", conversation.matchId);
  } else {
    // Both directions of the 1:1 thread.
    const them = conversation.userId;
    query = query
      .eq("scope", "direct")
      .or(
        `and(sender_id.eq.${viewerId},recipient_id.eq.${them}),` +
          `and(sender_id.eq.${them},recipient_id.eq.${viewerId})`,
      );
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as Row[]).map(toMessage).reverse();
}

export async function sendMessage(
  conversation: Conversation,
  senderId: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  const row = {
    scope: conversation.scope,
    sender_id: senderId,
    body: trimmed,
    match_id: conversation.scope === "match" ? conversation.matchId : null,
    recipient_id: conversation.scope === "direct" ? conversation.userId : null,
  };

  const { error } = await supabase.from("messages").insert(row);
  if (error) throw error;
}

/** Does this realtime row belong to the conversation on screen? */
function belongsTo(
  row: Row,
  conversation: Conversation,
  viewerId: string,
): boolean {
  if (row.scope !== conversation.scope) return false;

  if (conversation.scope === "public") return true;
  if (conversation.scope === "match") return row.match_id === conversation.matchId;

  const them = conversation.userId;
  return (
    (row.sender_id === viewerId && row.recipient_id === them) ||
    (row.sender_id === them && row.recipient_id === viewerId)
  );
}

/**
 * Live-subscribes to new messages in a conversation. RLS is enforced on the
 * realtime stream too, so nothing arrives that the viewer couldn't read.
 * Sender names aren't in the payload, so they're resolved on arrival.
 */
export function subscribeToMessages(
  conversation: Conversation,
  viewerId: string,
  onMessage: (message: ChatMessage) => void,
): RealtimeChannel {
  const key =
    conversation.scope === "public"
      ? "public"
      : conversation.scope === "match"
        ? `match-${conversation.matchId}`
        : `direct-${[viewerId, conversation.userId].sort().join("-")}`;

  const channel = supabase
    .channel(`chat:${key}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const row = payload.new as Row;
        if (!belongsTo(row, conversation, viewerId)) return;

        const { data } = await supabase
          .from("users")
          .select("name, avatar_url")
          .eq("id", row.sender_id)
          .maybeSingle();

        onMessage({
          ...toMessage(row),
          sender_name: data?.name ?? "Unknown",
          sender_avatar: data?.avatar_url ?? null,
        });
      },
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel | null) {
  if (channel) supabase.removeChannel(channel);
}
