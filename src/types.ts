// Shared types for the whole app, based on supabase/migrations/initial_schema.sql
// Import these instead of redefining shapes in individual pages so everyone
// stays in sync with the database schema.

export type Profile = {
  id: string;
  name: string;
  email: string;
  skill_level: string | null;
  avatar_url: string | null;
  bio: string | null;
};

// A player as shown on their public profile page (/players/:id). Same row as
// Profile minus the private email.
export type PublicProfile = {
  id: string;
  name: string;
  skill_level: string | null;
  avatar_url: string | null;
  bio: string | null;
};

// Aggregate counts shown on the public player profile.
export type PlayerStats = {
  gamesPlayed: number; // approved participations
  gamesWon: number; // matches whose final score went their team's way
  noShows: number; // matches they were marked absent for
};

export interface Match {
  id: string;
  title: string;
  sport: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  match_date: string; // date, e.g. "2026-09-12"
  match_time: string; // time, e.g. "18:30:00"
  max_players: number;
  skill_level: string | null;
  description: string | null;
  created_by: string | null;
  host?: MatchHost | null;
}

export type MatchHost = {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
};


export interface MatchParticipant {
  match_id: string;
  user_id: string;
}
