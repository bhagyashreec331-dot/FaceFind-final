import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { resetPassword } from '../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await resetPassword({ token: params.get('token'), password });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Could not reset password. The link may have expired.');
    }
  };

  return (
    <Layout hideFooter>
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Set a new password</h1>
          <p className="sub">Choose a new password for your account.</p>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Update password</button>
          </form>

          <div className="auth-foot">
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
