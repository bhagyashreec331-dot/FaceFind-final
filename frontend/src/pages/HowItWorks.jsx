import Layout from '../components/Layout';

const photographerSteps = [
  { title: 'Create an event', desc: 'Name the event and set an expiry date for how long the gallery stays live.' },
  { title: 'Share the event code or link', desc: 'Give attendees a code or QR link they use to join.' },
  { title: 'Upload the shoot', desc: 'Drop in the full set of event photos for processing.' },
  { title: 'AI indexes every face', desc: 'Each photo is scanned and faces are converted into searchable embeddings.' },
];

const participantSteps = [
  { title: 'Join the event', desc: 'Enter the event code or open the shared link.' },
  { title: 'Browse the public gallery', desc: 'Preview and download any photo from the open event gallery.' },
  { title: 'Upload a selfie', desc: 'A clear, front-facing selfie gives the best match quality.' },
  { title: 'Get your private gallery', desc: 'Only photos matching your face appear \u2014 visible to you alone.' },
];

export default function HowItWorks() {
  return (
    <Layout>
      <div className="container section">
        <div className="section-head">
          <h2>How It Works</h2>
          <p>Two short flows: one for the photographer setting up the event, one for the guest finding their photos.</p>
        </div>

        <h3 style={{ marginBottom: 16 }}>For photographers</h3>
        <div className="grid-2" style={{ marginBottom: 48 }}>
          {photographerSteps.map((s, i) => (
            <div className="step-row" key={s.title}>
              <span className="step-index">{i + 1}</span>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: 16 }}>For participants</h3>
        <div className="grid-2">
          {participantSteps.map((s, i) => (
            <div className="step-row" key={s.title}>
              <span className="step-index">{i + 1}</span>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
