// Single source of truth for who can do what inside a match.
//
// Roles:
//   host   - the match's current `created_by`. Set to the creator on creation,
//            moved by "transfer host". Exactly one per match.
//   player - an approved participant who is not the host ("regular player").
//   guest  - a signed-in user who is only viewing (not approved on the roster).
//
// "All player" permissions in the spec cover host + player (everything except
// guest).

export type MatchRole = "host" | "player" | "guest";

export function matchRole(
  createdBy: string | null | undefined,
  currentUserId: string | null | undefined,
  isApprovedParticipant: boolean,
): MatchRole {
  if (currentUserId && createdBy && currentUserId === createdBy) return "host";
  if (isApprovedParticipant) return "player";
  return "guest";
}

/**
 * The permission matrix. Every UI gate and, where practical, every service call
 * references one of these so the rules live in exactly one place.
 */
export const can = {
  // Host only
  editMatch: (r: MatchRole) => r === "host",
  reviewJoinRequests: (r: MatchRole) => r === "host",
  kickPlayer: (r: MatchRole) => r === "host",
  transferHost: (r: MatchRole) => r === "host",
  markAttendance: (r: MatchRole) => r === "host",
  assignTeams: (r: MatchRole) => r === "host",
  reshuffleTeams: (r: MatchRole) => r === "host",
  submitMatchReport: (r: MatchRole) => r === "host",

  // Regular player only — the host must transfer the role away before leaving.
  leaveMatch: (r: MatchRole) => r === "player",

  // Everyone in the match (host + regular players)
  reportPlayers: (r: MatchRole) => r === "host" || r === "player",
  endorsePlayers: (r: MatchRole) => r === "host" || r === "player",
  viewPlayerProfiles: (r: MatchRole) => r === "host" || r === "player",
  giveFeedback: (r: MatchRole) => r === "host" || r === "player",
} as const;
