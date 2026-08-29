import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

// Shared page shell: skip link, Navbar up top, routed page content in the
// middle. Individual pages (src/pages/*) should NOT render their own nav —
// just return their content and it'll be dropped into <main> here.
export function Layout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Navbar />
      <main className="page-content" id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap site-footer-inner">
          <span className="site-footer-brand">
            Match<span className="accent-word">Up</span>
          </span>
          <span>Pickup sport, sorted.</span>
        </div>
      </footer>
    </div>
  );
}
