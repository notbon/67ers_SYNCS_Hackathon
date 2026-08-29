import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="page">
      <h1>Page not found</h1>
      <p className="page-subtitle">
        That page doesn't exist. <Link to="/">Head back to Browse Matches</Link>.
      </p>
    </section>
  );
}
