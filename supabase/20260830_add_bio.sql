-- Player bio: a short free-text blurb shown on the public player profile
-- (/players/:id) and editable from a user's own Profile page.
alter table users add column if not exists bio text;
