import { useParams } from 'react-router-dom';

// TODO (Person 3 — Match Details + Join):
// `id` below is the match's UUID from the URL (/matches/:id). Fetch the
// match + participant count from Supabase, and wire up Join/Leave against
// the match_participants table.
export default function MatchDetails() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="page page-narrow">
      <p className="eyebrow">Match</p>
      <h1>Match details</h1>
      <p className="page-subtitle">
        Roster, location and the join button will live here.
      </p>
      <p className="placeholder-note">
        Match ID: <code>{id}</code>
      </p>
    </section>
  );
}
