import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import Layout from '../components/Layout';

import { getEvent } from '../services/api';

import { useAuth } from '../context/AuthContext';

import { getJoinedEventIds } from '../utils/joinedEvents';

export default function ParticipantDashboard() {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getJoinedEventIds();

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(ids.map((id) => getEvent(id).catch(() => null)))
      .then((results) => setEvents(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, []);

  const leaveEvent = (eventId, eventName) => {
    const confirmed = window.confirm(
      `Are you sure you want to leave "${eventName}"?`
    );

    if (!confirmed) return;

    const currentIds = getJoinedEventIds();

    const updatedIds = currentIds.filter(
      (id) => id !== eventId
    );

    window.localStorage.setItem(
      'facefind-joined-events',
      JSON.stringify(updatedIds)
    );

    setEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== eventId)
    );
  };

  return (
    <Layout>
      <div className="dash">
        <aside className="dash-side">
          <Link
            to="/dashboard/participant"
            className="active"
          >
            Dashboard
          </Link>

          <Link to="/join-event">
            Join event
          </Link>

          <Link to="/dashboard/account">
            Account settings
          </Link>
        </aside>

        <div className="dash-main">
          <div className="dash-head">
            <div>
              <h2>
                Welcome back, {user.name.split(' ')[0]}
              </h2>

              <p>
                Events you've joined and the photos matched to you.
              </p>
            </div>

            <Link
              to="/join-event"
              className="btn btn-primary"
            >
              + Join event
            </Link>
          </div>

          <h3
            style={{
              marginBottom: 16,
              fontSize: '1.05rem',
            }}
          >
            Your events
          </h3>

          {loading ? (
            <p>Loading your events…</p>
          ) : events.length === 0 ? (
            <div className="empty-state">
              You haven't joined an event yet. Enter an event code to see your
              matched photos.
            </div>
          ) : (
            <div className="grid-3">
              {events.map((ev) => (
                <div
                  className="corner-card"
                  key={ev.id}
                >
                  <h3
                    style={{
                      fontSize: '1rem',
                      marginBottom: 4,
                    }}
                  >
                    {ev.name}
                  </h3>

                  <p style={{ marginBottom: 12 }}>
                    {ev.photo_count} photos in gallery
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Link
                      to={`/event/${ev.id}`}
                      className="btn btn-outline"
                    >
                      Open gallery
                    </Link>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        leaveEvent(ev.id, ev.name)
                      }
                    >
                      Leave event
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}