// The "/" route is the Browse Matches experience. The implementation lives in
// MatchBrowse.tsx (search + filter by location, sport, skill level, date and
// time); Home just mounts it so App.tsx routing stays untouched.
import MatchBrowse from "./MatchBrowse";

export default function Home() {
  return <MatchBrowse />;
}
