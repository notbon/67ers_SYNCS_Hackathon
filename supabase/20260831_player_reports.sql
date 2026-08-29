-- Optional: makes the post-match "report a player" action persist. Until this
-- runs, reportPlayer() in src/services/matchService.ts fails soft and the UI
-- says reporting isn't available yet.
create table if not exists player_reports (
    id           uuid primary key default gen_random_uuid(),
    match_id     uuid not null references matches(id) on delete cascade,
    reporter_id  uuid not null references users(id) on delete cascade,
    reported_id  uuid not null references users(id) on delete cascade,
    reason       text not null check (char_length(btrim(reason)) between 1 and 1000),
    created_at   timestamptz not null default now(),

    unique (match_id, reporter_id, reported_id),
    check (reporter_id <> reported_id)
);

create index if not exists player_reports_reported_idx on player_reports (reported_id);
