import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useFriendRequests } from '../context/FriendRequestsContext';
import './Navbar.css';

const LINKS = [
  { to: '/', label: 'Browse', end: true },
  { to: '/create', label: 'Create' },
  { to: '/search', label: 'Search' },
  { to: '/profile', label: 'Profile' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { requests } = useFriendRequests();
  const pending = requests.length;

  return (
    <header className="navbar">
      <div className="navbar-inner wrap">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-block" aria-hidden="true" />
          Match<span className="brand-accent">Up</span>
        </NavLink>

        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="primary-nav"
          aria-label="Primary"
          className={`nav-links ${open ? 'open' : ''}`}
        >
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
              {link.to === '/search' && pending > 0 && (
                <>
                  <span className="nav-badge" aria-hidden="true">
                    {pending}
                  </span>
                  <span className="visually-hidden">
                    , {pending} friend request{pending === 1 ? '' : 's'} waiting
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
