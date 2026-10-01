import { useState } from 'react';
import { Link } from 'react-router-dom';

import Layout from '../components/Layout';
import ScanIllustration from '../components/ScanIllustration';
import { useAuth } from '../context/AuthContext';

const flows = {
  guest: {
    label: "I'm a guest",
    intro: 'Get your photos without scrolling through hundreds of strangers.',
    steps: [
      {
        title: 'Join with the event code',
        desc: 'Your photographer shares it. Paste it in and you are in.',
      },
      {
        title: 'Take a selfie',
        desc: 'Use the live camera or upload one. Front-facing and well lit works best.',
      },
      {
        title: 'Open your photos',
        desc: 'Only pictures with you in them show up, and only you can see them.',
      },
      {
        title: 'Preview and download',
        desc: 'Look at each photo full size, then save them one by one or all at once.',
      },
    ],
    cta: { to: '/register', label: 'Register as a guest' },
  },

  photographer: {
    label: "I'm a photographer",
    intro:
      'Upload the shoot once and stop answering "can you send me that one?"',
    steps: [
      {
        title: 'Create an event',
        desc: 'Name it, optionally set a closing date, and get a join code.',
      },
      {
        title: 'Upload the shoot',
        desc: 'Send photos as public or match-only. Faces are indexed automatically.',
      },
      {
        title: 'Share the code',
        desc: 'Post it in the group chat or print it on a card.',
      },
      {
        title: 'Guests help themselves',
        desc: 'Each guest finds and downloads their own photos.',
      },
    ],
    cta: { to: '/register', label: 'Register as a photographer' },
  },
};

export default function Home() {
  const [who, setWho] = useState('guest');
  const { user } = useAuth();
  const flow = flows[who];

  return (
    <Layout>
      <div className="container">
        <section className="hero">
          <div>
            <span className="eyebrow-tag">
              Event photos, sorted by face
            </span>

            <h1>Find yourself in every event photo.</h1>

            <p className="lead">
              Upload one selfie and FaceFind picks out the photos you are in
              from the photographer's full gallery. Guests get their pictures
              in seconds; photographers stop sorting them by hand.
            </p>

            <div className="hero-actions">
              {user ? (
                <Link
                  to={`/dashboard/${user.role}`}
                  className="btn btn-primary"
                >
                  Go to your dashboard
                </Link>
              ) : (
                <Link to="/register" className="btn btn-primary">
                  Get started free
                </Link>
              )}

              <Link to="/how-it-works" className="btn btn-outline">
                See how it works
              </Link>
            </div>
          </div>

          <div className="scan-frame">
            <ScanIllustration />
          </div>
        </section>
      </div>

      <section className="band">
        <div className="container">
          <div className="section-head">
            <h2>Two sides of the camera, one flow</h2>
            <p>{flow.intro}</p>
          </div>

          <div
            className="segment-toggle audience-toggle"
            role="tablist"
            aria-label="Choose your role"
          >
            {Object.entries(flows).map(([key, f]) => (
              <button
                key={key}
                role="tab"
                aria-selected={who === key}
                type="button"
                className={who === key ? 'active' : ''}
                onClick={() => setWho(key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <ol className="flow-list">
            {flow.steps.map((s, i) => (
              <li key={s.title}>
                <span className="step-index">{i + 1}</span>

                <div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          {!user && (
            <div style={{ marginTop: 28 }}>
              <Link to={flow.cta.to} className="btn btn-primary">
                {flow.cta.label}
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="container">
        <section className="cta-panel">
          <div>
            <h2>Ready to Find Your Event Photos?</h2>

            <p>
              Join your event with the code provided by your photographer and
              find your photos with FaceFind AI.
            </p>
          </div>

          <Link to="/join-event" className="btn btn-accent">
            Join Event
          </Link>
        </section>
      </div>
    </Layout>
  );
}