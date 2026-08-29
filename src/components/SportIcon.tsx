/**
 * Blocky geometric sport icons.
 *
 * Square terminals, heavy strokes and solid fills to match the app's
 * hard-edged visual language. Icons are purely decorative — the sport name is
 * always rendered as text alongside them — so they're hidden from screen
 * readers via aria-hidden.
 */

import {
  FaBasketballBall,
  FaVolleyballBall,
  FaRunning,
  FaFootballBall,
} from "react-icons/fa";

import { GiSoccerBall, GiTennisBall } from "react-icons/gi";
type Props = {
  sport: string;
  size?: number;
  className?: string;
};

export function SportIcon({
  sport,
  size = 22,
  className,
}: Props) {
  const props = {
    size,
    className,
    "aria-hidden": true,
  };

  switch (sport.toLowerCase()) {
    case "soccer":
      return <GiSoccerBall {...props} />;

    case "basketball":
      return <FaBasketballBall {...props} />;

    case "tennis":
      return <GiTennisBall {...props} />;

    case "volleyball":
      return <FaVolleyballBall {...props} />;

    case "touch football":
      return <FaFootballBall {...props} />;

    case "running":
      return <FaRunning {...props} />;

    default:
      return null;
  }
}

export default SportIcon;