/**
 * Blocky geometric sport icons.
 *
 * Square terminals, heavy strokes and solid fills to match the app's
 * hard-edged visual language. Icons are purely decorative — the sport name is
 * always rendered as text alongside them — so they're hidden from screen
 * readers via aria-hidden.
 */

type Props = {
  sport: string;
  size?: number;
  className?: string;
};

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.25,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
};

function Paths({ sport }: { sport: string }) {
  switch (sport.toLowerCase()) {
    case 'basketball':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M12 3v18M3 12h18" {...common} />
          <path d="M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8" {...common} strokeWidth={1.75} />
        </>
      );
    case 'soccer':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M12 8.2l3.4 2.5-1.3 4h-4.2l-1.3-4z" fill="currentColor" stroke="none" />
          <path d="M12 3v3.2M4.2 9.4l2.9 1.3M19.8 9.4l-2.9 1.3M7.6 20.2l1.6-2.7M16.4 20.2l-1.6-2.7" {...common} strokeWidth={1.75} />
        </>
      );
    case 'tennis':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M5 5.4c3.2 2.1 4.6 5.6 4 11.2M19 5.4c-3.2 2.1-4.6 5.6-4 11.2" {...common} strokeWidth={1.9} />
        </>
      );
    case 'volleyball':
      return (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M12 3c-3.4 4-3.9 8.4-1.6 13.4M12 3c3.4 4 3.9 8.4 1.6 13.4" {...common} strokeWidth={1.9} />
          <path d="M3.4 14.2c5-1.4 9.4-.6 13 2.6" {...common} strokeWidth={1.9} />
        </>
      );
    case 'touch football':
      return (
        <>
          <path
            d="M4 20C2.8 13.4 5.1 7.6 10 5c4.9-2.6 8.6-1.4 10 0 1.4 1.4 2.6 5.1 0 10-2.6 4.9-8.4 7.2-16 5z"
            {...common}
          />
          <path d="M9 15l6-6M10.6 12.4l1.6 1.6M12.4 10.6l1.6 1.6" {...common} strokeWidth={1.9} />
        </>
      );
    case 'running':
      return (
        <>
          <circle cx="14.5" cy="5" r="2.4" fill="currentColor" stroke="none" />
          <path d="M13.6 9.2L9.8 11.4l2.4 3.2-1.6 5.6M12.2 14.6l4 1.4 1.4 4M9.8 11.4l-4.4 1M3 17.4h4" {...common} />
        </>
      );
    default:
      return (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" {...common} />
          <path d="M8.5 12h7M12 8.5v7" {...common} />
        </>
      );
  }
}

export function SportIcon({ sport, size = 22, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <Paths sport={sport} />
    </svg>
  );
}

export default SportIcon;
