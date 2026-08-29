/**
 * One colour per sport, so a glance at the list tells you what's what.
 *
 * Every `color` clears WCAG AA (4.5:1) against both surfaces it's used on:
 * the white card, and its own `tint`. Because contrast is symmetric, that
 * also means white text on a filled block of the colour passes. So one token
 * safely serves as label text, border, and filled background.
 *
 * Verified ratios (colour-on-white / colour-on-tint):
 *   soccer 7.13/6.49 · basketball 5.18/4.52 · tennis 4.99/4.60
 *   volleyball 6.70/5.49 · touch football 7.10/5.98 · running 6.29/5.24
 */

export type SportTheme = {
  color: string;
  tint: string;
};

const THEMES: Record<string, SportTheme> = {
  soccer: { color: "#166534", tint: "#dcfce7" },
  basketball: { color: "#c2410c", tint: "#ffedd5" },
  tennis: { color: "#4d7c0f", tint: "#ecfccb" },
  volleyball: { color: "#1d4ed8", tint: "#dbeafe" },
  "touch football": { color: "#6d28d9", tint: "#ede9fe" },
  running: { color: "#be123c", tint: "#ffe4e6" },
};

const FALLBACK: SportTheme = { color: "#0a0a0a", tint: "#f1f1ee" };

export function sportTheme(sport: string | null | undefined): SportTheme {
  if (!sport) return FALLBACK;
  return THEMES[sport.trim().toLowerCase()] ?? FALLBACK;
}

/** CSS custom properties to spread onto an element's style. */
export function sportVars(sport: string | null | undefined) {
  const { color, tint } = sportTheme(sport);
  return {
    "--sport": color,
    "--sport-tint": tint,
  } as React.CSSProperties;
}
