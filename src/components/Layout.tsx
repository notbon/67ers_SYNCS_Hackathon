import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

// Shared page shell: Navbar up top, routed page content in the middle.
// Individual pages (src/pages/*) should NOT render their own nav — just
// return their content and it'll be dropped into <main> here.
export function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
