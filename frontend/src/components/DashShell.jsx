import { NavLink } from 'react-router-dom';
import Layout from './Layout';
import { useAuth } from '../context/AuthContext';

// Shared sidebar + content frame for signed-in pages (both roles).
export default function DashShell({ children }) {
  const { user } = useAuth();
  const isPhotographer = user?.role === 'photographer';

  const items = isPhotographer
    ? [
        { to: '/dashboard/photographer', label: 'Dashboard', end: true },
        { to: '/create-event', label: 'Create event' },
        { to: '/dashboard/account', label: 'Account settings' },
      ]
    : [
        { to: '/dashboard/participant', label: 'Dashboard', end: true },
        { to: '/join-event', label: 'Join event' },
        { to: '/dashboard/account', label: 'Account settings' },
      ];

  return (
    <Layout>
      <div className="dash">
        <aside className="dash-side">
          <div className="dash-user">
            <span className="avatar">{user?.name?.[0]?.toUpperCase() || '?'}</span>
            <div>
              <div className="dash-user-name">{user?.name}</div>
              <div className="dash-user-role">{isPhotographer ? 'Photographer' : 'Participant'}</div>
            </div>
          </div>
          <nav>
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end}>{i.label}</NavLink>
            ))}
          </nav>
        </aside>
        <div className="dash-main">
          <nav className="dash-tabs" aria-label="Dashboard sections">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end}>{i.label}</NavLink>
            ))}
          </nav>
          {children}
        </div>
      </div>
    </Layout>
  );
}
