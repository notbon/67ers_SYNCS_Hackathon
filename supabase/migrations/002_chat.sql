-- ============================================================
-- Chat: public room, per-match rooms, and gated direct messages
--
-- Messaging rule: you may DM someone only if you are accepted
-- friends OR you are both signed up to the same match.
-- ============================================================

-- ---------- Friendships ----------

CREATE TABLE IF NOT EXISTS friendships (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships (requester_id, status);

-- ---------- Messages ----------
-- One table, three scopes:
--   public -> match_id NULL, recipient_id NULL
--   match  -> match_id set,  recipient_id NULL
--   direct -> match_id NULL, recipient_id set

CREATE TABLE IF NOT EXISTS messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope         TEXT NOT NULL CHECK (scope IN ('public', 'match', 'direct')),
    match_id      UUID REFERENCES matches(id) ON DELETE CASCADE,
    recipient_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body          TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        (scope = 'public' AND match_id IS NULL     AND recipient_id IS NULL)
     OR (scope = 'match'  AND match_id IS NOT NULL AND recipient_id IS NULL)
     OR (scope = 'direct' AND match_id IS NULL     AND recipient_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS messages_public_idx ON messages (created_at)
    WHERE scope = 'public';
CREATE INDEX IF NOT EXISTS messages_match_idx  ON messages (match_id, created_at);
CREATE INDEX IF NOT EXISTS messages_direct_idx ON messages (sender_id, recipient_id, created_at);

-- ---------- Helpers ----------

-- Is `viewer` signed up to `match`?
CREATE OR REPLACE FUNCTION is_in_match(viewer UUID, match UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM match_participants p
        WHERE p.match_id = match AND p.user_id = viewer
    );
$$;

-- May `a` message `b`? Accepted friends, or both in the same match.
CREATE OR REPLACE FUNCTION can_message(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = a AND f.addressee_id = b)
            OR (f.requester_id = b AND f.addressee_id = a))
    )
    OR EXISTS (
        SELECT 1
        FROM match_participants p1
        JOIN match_participants p2 ON p1.match_id = p2.match_id
        WHERE p1.user_id = a AND p2.user_id = b
    );
$$;

-- ---------- Row level security ----------

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages    ENABLE ROW LEVEL SECURITY;

-- Friendships: you can see and act on rows you're part of.
DROP POLICY IF EXISTS friendships_select ON friendships;
CREATE POLICY friendships_select ON friendships FOR SELECT
    USING (auth.uid() IN (requester_id, addressee_id));

DROP POLICY IF EXISTS friendships_insert ON friendships;
CREATE POLICY friendships_insert ON friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Only the addressee can accept a pending request.
DROP POLICY IF EXISTS friendships_update ON friendships;
CREATE POLICY friendships_update ON friendships FOR UPDATE
    USING (auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = addressee_id);

DROP POLICY IF EXISTS friendships_delete ON friendships;
CREATE POLICY friendships_delete ON friendships FOR DELETE
    USING (auth.uid() IN (requester_id, addressee_id));

-- Messages: read access per scope.
DROP POLICY IF EXISTS messages_select ON messages;
CREATE POLICY messages_select ON messages FOR SELECT
    USING (
        CASE scope
            WHEN 'public' THEN auth.uid() IS NOT NULL
            WHEN 'match'  THEN is_in_match(auth.uid(), match_id)
            WHEN 'direct' THEN auth.uid() IN (sender_id, recipient_id)
            ELSE false
        END
    );

-- Messages: you may only send as yourself, and only where you're allowed.
DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND CASE scope
            WHEN 'public' THEN true
            WHEN 'match'  THEN is_in_match(auth.uid(), match_id)
            WHEN 'direct' THEN can_message(auth.uid(), recipient_id)
            ELSE false
        END
    );

-- Senders can delete their own messages.
DROP POLICY IF EXISTS messages_delete ON messages;
CREATE POLICY messages_delete ON messages FOR DELETE
    USING (auth.uid() = sender_id);

-- ---------- Realtime ----------

ALTER TABLE messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
