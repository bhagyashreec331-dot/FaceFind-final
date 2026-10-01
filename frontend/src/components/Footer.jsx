import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col">
          <div className="brand" style={{ marginBottom: 12 }}>
            <Logo /> FaceFind
          </div>
          <p style={{ maxWidth: '32ch' }}>
            AI-powered face matching that helps people find their own photos from an
            event gallery in seconds.
          </p>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <Link to="/how-it-works">How It Works</Link>
          <Link to="/features">Features</Link>
          <Link to="/about">About FaceFind</Link>
        </div>

        <div className="footer-col">
          <h4>Account</h4>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} FaceFind. All rights reserved.</span>
        <span>Made for event photographers & attendees.</span>
      </div>
    </footer>
  );
}
