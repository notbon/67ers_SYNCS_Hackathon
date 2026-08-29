import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="page page-narrow">
      <p className="eyebrow">Error 404</p>
      <h1>
        Off the <span className="mark">pitch</span>
      </h1>
      <p className="page-subtitle">
        That page doesn't exist — it may have been moved, or the link was
        mistyped.
      </p>
      <Link to="/" className="btn-primary">
        Back to browse
      </Link>
    </section>
  );
}
