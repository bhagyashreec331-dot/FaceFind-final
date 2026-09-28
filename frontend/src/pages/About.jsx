import Layout from '../components/Layout';

export default function About() {
  return (
    <Layout>
      <div className="container section">
        <div className="section-head">
          <h2>About FaceFind</h2>
          <p>
            FaceFind exists to close the gap between the moment a photo is taken and the
            moment the person in it actually gets to see it. Event photographers shoot
            hundreds of frames; guests only want the handful they're in.
          </p>
        </div>

        <div className="grid-2">
          <div className="corner-card">
            <h3 style={{ marginBottom: 8, fontSize: '1.05rem' }}>For photographers</h3>
            <p>
              Upload a full event gallery once. FaceFind indexes every face in the set so
              you never have to manually sort or tag photos by attendee again.
            </p>
          </div>
          <div className="corner-card">
            <h3 style={{ marginBottom: 8, fontSize: '1.05rem' }}>For participants</h3>
            <p>
              Join an event with a code or link, upload one selfie, and get a private
              gallery of only the photos you actually appear in.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <h3 style={{ marginBottom: 8, fontSize: '1.05rem' }}>How matching works</h3>
          <p>
            A selfie is converted into a facial embedding and compared against embeddings
            generated from the event gallery. Matches above a similarity threshold are
            added to that participant's private gallery. Recognition accuracy depends on
            image quality and pose, and works best with a clear, front-facing selfie.
          </p>
        </div>
      </div>
    </Layout>
  );
}
