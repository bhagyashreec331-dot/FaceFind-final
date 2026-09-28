import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About FaceFind' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/features', label: 'Features' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <Logo /> FaceFind
        </Link>

        <nav className="nav-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light and dark theme"
            title="Toggle theme"
          >
            <span className="theme-toggle-knob">{theme === 'dark' ? '🌙' : '☀'}</span>
          </button>

          {user ? (
            <>
              <Link to={`/dashboard/${user.role}`} className="btn btn-ghost">
                {user.name.split(' ')[0]}'s dashboard
              </Link>
              <button className="btn btn-outline" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
          <button className="nav-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰</button>
        </div>
      </div>

      {open && (
        <div className="container" style={{ paddingBottom: 16 }}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} style={{ display: 'block', padding: '8px 0' }} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
