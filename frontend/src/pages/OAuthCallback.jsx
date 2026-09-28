import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const { setSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const id = params.get('id');
    const name = params.get('name');
    const role = params.get('role');

    if (token && id && role) {
      setSession(token, { id, name: name || 'there', role });
      navigate(`/dashboard/${role}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout hideFooter>
      <div className="auth-wrap">
        <p>Signing you in…</p>
      </div>
    </Layout>
  );
}
