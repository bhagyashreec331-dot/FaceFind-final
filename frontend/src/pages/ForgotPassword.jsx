import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { requestPasswordReset } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send reset link. Try again.');
    }
  };

  return (
    <Layout hideFooter>
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Reset your password</h1>
          <p className="sub">Enter the email on your account and we'll send a reset link.</p>

          {error && <div className="form-error" role="alert">{error}</div>}

          {sent ? (
            <p>If an account exists for that email, a reset link is on its way.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Send reset link</button>
            </form>
          )}

          <div className="auth-foot">
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
