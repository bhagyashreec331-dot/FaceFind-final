import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import Layout from '../components/Layout';

import {
  deleteEvent,
  listMyEvents,
} from '../services/api';

import { useAuth } from '../context/AuthContext';

export default function PhotographerDashboard() {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    listMyEvents()
      .then((data) => {
        if (active) {
          setEvents(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err.message || 'Could not load your events.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const totalPhotos = events.reduce(
    (sum, e) => sum + (e.photo_count || 0),
    0
  );

  const totalFacesMatched = events.reduce(
    (sum, e) => sum + (e.faces_matched || 0),
    0
  );

  const handleDeleteEvent = async (event) => {
    const confirmed = window.confirm(
      `Delete "${event.name}"?\n\nThis will permanently delete the event, all uploaded photos, thumbnails, and face-match data. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await deleteEvent(event.id);

      setEvents((currentEvents) =>
        currentEvents.filter(
          (item) => item.id !== event.id
        )
      );
    } catch (err) {
      setError(
        err.message || 'Could not delete the event.'
      );
    }
  };

  return (
    <Layout>
      <div className="dash">

        <div className="dash-main">

          <div className="dash-head">

            <div>
              <h2>
                Welcome back,{' '}
                {user.name.split(' ')[0]}
              </h2>

              <p>
                Create events and manage the galleries
                you upload.
              </p>
            </div>

            <Link
              to="/create-event"
              className="btn btn-primary"
            >
              + Create event
            </Link>

          </div>

          {/* STATISTICS */}

          <div
            className="grid-3"
            style={{ marginBottom: 32 }}
          >

            <div className="stat-card">

              <div className="num">
                {events.length}
              </div>

              <div className="label">
                Active events
              </div>

            </div>

            <div className="stat-card">

              <div className="num">
                {totalPhotos}
              </div>

              <div className="label">
                Photos uploaded
              </div>

            </div>

            <div className="stat-card">

              <div className="num">
                {totalFacesMatched}
              </div>

              <div className="label">
                Faces matched
              </div>

            </div>

          </div>

          <h3
            style={{
              marginBottom: 16,
              fontSize: '1.05rem',
            }}
          >
            Your events
          </h3>

          {error && (
            <div
              className="form-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {loading ? (

            <p>Loading your events…</p>

          ) : events.length === 0 ? (

            <div className="empty-state">
              You haven't created an event yet. Create
              one to get an event code you can share with
              attendees.
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

                  <p
                    style={{
                      marginBottom: 12,
                    }}
                  >
                    Code: {ev.code} ·{' '}
                    {ev.photo_count} photos
                  </p>

                  <p
                    style={{
                      marginBottom: 12,
                      fontSize: '0.9rem',
                    }}
                  >
                    {ev.faces_matched || 0} faces matched
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >

                    <Link
                      to={`/upload-photos/${ev.id}`}
                      className="btn btn-outline"
                    >
                      Upload photos
                    </Link>

                    <Link
                      to={`/event/${ev.id}`}
                      className="btn btn-ghost"
                    >
                      View gallery
                    </Link>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        handleDeleteEvent(ev)
                      }
                    >
                      Delete event
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