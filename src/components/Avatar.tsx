import { avatarColour, initials } from "../lib/avatar";
import "./Avatar.css";

/**
 * A person's photo, falling back to coloured initials when they haven't
 * uploaded one. Used in chat, search results and match rosters so a face
 * looks the same everywhere it appears.
 *
 * Decorative by default (the name is rendered as text alongside), so it's
 * aria-hidden unless a `label` is given.
 */
type Props = {
  id: string;
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
  /** Accessible name — only pass when no adjacent text names the person. */
  label?: string;
};

export function Avatar({ id, name, url, size = 32, className, label }: Props) {
  const box = { width: size, height: size };
  const classes = `avatar ${className ?? ""}`.trim();

  if (url) {
    return (
      <img
        className={classes}
        style={box}
        src={url}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        title={name}
        loading="lazy"
        width={size}
        height={size}
      />
    );
  }

  return (
    <span
      className={`${classes} avatar--initials`}
      style={{
        ...box,
        background: avatarColour(id),
        fontSize: Math.max(9, Math.round(size * 0.38)),
      }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export default Avatar;
