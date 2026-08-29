CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    skill_level TEXT
);

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    sport TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    match_date DATE NOT NULL,
    match_time TIME NOT NULL,
    max_players INTEGER NOT NULL,
    skill_level TEXT,
    description TEXT,
    created_by UUID REFERENCES users(id)
);

CREATE TABLE match_participants (
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    PRIMARY KEY (match_id, user_id)
);