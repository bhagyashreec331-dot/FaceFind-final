import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { joinEvent } from '../services/api';
import { addJoinedEventId } from '../utils/joinedEvents';

export default function JoinEvent() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const event = await joinEvent(code.trim());
      addJoinedEventId(event.id);
      navigate(`/event/${event.id}`);
    } catch (err) {
      setError(err.message || 'That event code could not be found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Join an event</h1>
          <p className="sub">Enter the event code shared by your photographer.</p>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="code">Event code</label>
              <input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 4F9A21BC" />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Joining…' : 'Join event'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
