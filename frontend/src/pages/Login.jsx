import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import GoogleButton from '../components/GoogleButton';
import PasswordField from '../components/PasswordField';
import { googleLogin } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.justRegistered;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      const redirectTo = location.state?.from || `/dashboard/${user.role}`;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="sub">Sign in to access your events and galleries.</p>

          {justRegistered && !error && (
            <div className="form-error" role="status" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              Account created. Sign in to continue.
            </div>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}

          <GoogleButton onClick={googleLogin} />
          <div className="divider">or sign in with email</div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" />
            </div>
            <PasswordField
              id="password"
              label="Password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
            <div style={{ textAlign: 'right', marginBottom: 18 }}>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Forgot password?</Link>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-foot">
            Don't have an account? <Link to="/register">Register</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
