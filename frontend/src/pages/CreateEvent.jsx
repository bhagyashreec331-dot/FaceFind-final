import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { createEvent } from '../services/api';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const event = await createEvent({
        name,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setCreated(event);
    } catch (err) {
      setError(err.message || 'Could not create the event.');
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <Layout>
        <div className="container section" style={{ maxWidth: 560 }}>
          <div className="corner-card">
            <h2 style={{ marginBottom: 8 }}>Event created</h2>
            <p style={{ marginBottom: 20 }}>Share this code with your guests so they can join "{created.name}".</p>
            <div className="stat-card" style={{ marginBottom: 20 }}>
              <div className="num" style={{ letterSpacing: 4 }}>{created.code}</div>
              <div className="label">Event code</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to={`/upload-photos/${created.id}`} className="btn btn-primary">Upload photos</Link>
              <Link to="/dashboard/photographer" className="btn btn-outline">Back to dashboard</Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Create an event</h1>
          <p className="sub">You'll get a code to share with guests once it's created.</p>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Event name</label>
              <input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya & Dev's Wedding" />
            </div>
            <div className="field">
              <label htmlFor="expires">Gallery closes on (optional)</label>
              <input id="expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating…' : 'Create event'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
