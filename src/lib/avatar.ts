/**
 * Initials + a stable colour for a person, used where there's no photo.
 *
 * Same approach (and palette) as HostBadge — kept here so other screens can
 * reuse it without importing a badge component. HostBadge could be switched
 * over to this later so there's a single source of truth.
 */

const PALETTE = [
  "#c2410c",
  "#1d4ed8",
  "#166534",
  "#6d28d9",
  "#be123c",
  "#0e7490",
  "#a16207",
  "#be185d",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic, so a person keeps the same colour between renders. */
export function avatarColour(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
