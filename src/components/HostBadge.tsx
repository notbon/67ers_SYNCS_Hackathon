import type { MatchHost } from "../types";
import "./HostBadge.css";

/**
 * Small "hosted by" chip: a profile photo (or a generated initials avatar when
 * there's no photo) next to the host's name. Reused by the match cards now and
 * available for the match details page later.
 */
type Props = {
  host?: MatchHost | null;
  /** Shown when no host has been resolved yet (e.g. auth not wired up). */
  fallbackLabel?: string;
  /** Avatar edge length in px. */
  size?: number;
};

// Fixed set so a given host always gets the same colour between renders.
const PALETTE = [
  "#ff5a00",
  "#2563eb",
  "#15803d",
  "#7c3aed",
  "#be123c",
  "#0e7490",
  "#a16207",
  "#be185d",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colourFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // keep it a 32-bit int
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function HostBadge({
  host,
  fallbackLabel = "Host TBA",
  size = 28,
}: Props) {
  const name = host?.display_name?.trim() || null;
  const box = { width: size, height: size };

  let avatar;
  if (host?.avatar_url) {
    avatar = (
      <img
        className="host-badge-avatar"
        style={box}
        src={host.avatar_url}
        alt=""
        loading="lazy"
        width={size}
        height={size}
      />
    );
  } else if (name) {
    avatar = (
      <span
        className="host-badge-avatar host-badge-avatar--initials"
        style={{
          ...box,
          background: colourFor(host?.id ?? name),
          fontSize: Math.round(size * 0.42),
        }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
    );
  } else {
    avatar = (
      <span
        className="host-badge-avatar host-badge-avatar--empty"
        style={box}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className="host-badge">
      {avatar}
      <span className="host-badge-text">
        <span className="host-badge-label">Host</span>
        <span className="host-badge-name">{name ?? fallbackLabel}</span>
      </span>
    </span>
  );
}
