import Layout from '../components/Layout';

const features = [
  { title: 'Event codes & links', desc: 'Every event gets a unique code and shareable link for guests to join.' },
  { title: 'AI face matching', desc: 'Face detection, embedding extraction, and similarity matching find each guest\u2019s own photos.' },
  { title: 'Public & private galleries', desc: 'A public gallery anyone can browse, plus a private gallery matched to each guest.' },
  { title: 'Bulk download', desc: 'Download individual photos or the entire matched set at once.' },
  { title: 'Event-based access control', desc: 'Only people who join with the correct event code can access that event\u2019s gallery.' },
  { title: 'Event expiry', desc: 'Photographers set an expiry window after which the event gallery closes.' },
  { title: 'Secure authentication', desc: 'Hashed passwords, session management, and password reset out of the box.' },
  { title: 'Cloud-hosted storage', desc: 'Event photos are stored on Cloudflare R2 for fast, reliable delivery.' },
];

export default function Features() {
  return (
    <Layout>
      <div className="container section">
        <div className="section-head">
          <h2>Features</h2>
          <p>Everything needed to run an event gallery from upload to guest download.</p>
        </div>
        <div className="grid-4">
          {features.map((f) => (
            <div className="corner-card" key={f.title}>
              <h3 style={{ fontSize: '0.98rem', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: '0.88rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
