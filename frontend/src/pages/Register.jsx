import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import GoogleButton from '../components/GoogleButton';
import PasswordField from '../components/PasswordField';
import { googleLogin, register as registerApi } from '../services/api';

export default function Register() {
  const [role, setRole] = useState('participant');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Deliberately not auto-signing the user in here — account creation and
      // sign-in are kept as separate steps, so we send them to /login next.
      await registerApi({ ...form, role });
      navigate('/login', { state: { justRegistered: true }, replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="sub">Join as a participant to find your photos, or a photographer to host an event.</p>

          <div className="role-toggle">
            <button type="button" className={role === 'participant' ? 'active' : ''} onClick={() => setRole('participant')}>
              Participant
            </button>
            <button type="button" className={role === 'photographer' ? 'active' : ''} onClick={() => setRole('photographer')}>
              Photographer
            </button>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <GoogleButton label="Continue with Google" onClick={() => googleLogin(role)} />
          <div className="divider">or register with email</div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" type="text" required value={form.name} onChange={handleChange} placeholder="Your name" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" />
            </div>
            <PasswordField
              id="password"
              label="Password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating account…' : `Register as ${role}`}
            </button>
          </form>

          <div className="auth-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
