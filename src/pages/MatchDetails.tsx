import { useParams } from 'react-router-dom';

// TODO (Person 3 — Match Details + Join):
// `id` below is the match's UUID from the URL (/matches/:id). Fetch the
// match + participant count from Supabase, and wire up Join/Leave against
// the match_participants table.
export default function MatchDetails() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="page">
      <h1>Match Details</h1>
      <p className="page-subtitle">Match ID: {id}</p>
    </section>
  );
}
