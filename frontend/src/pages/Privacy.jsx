import Layout from '../components/Layout';

export default function Privacy() {
  return (
    <Layout>
      <div className="legal">
        <h2 style={{ marginTop: 0, fontSize: '1.6rem' }}>Privacy Policy</h2>
        <p>This policy explains what data FaceFind collects and how it's used.</p>

        <h2>1. What we collect</h2>
        <p>Account details (name, email), event photos you upload as a photographer, and the selfie you upload as a participant.</p>

        <h2>2. Facial data</h2>
        <p>Selfies and event photos are converted into facial embeddings used only for matching within the event they belong to. Embeddings are not shared across events.</p>

        <h2>3. Who can see matched photos</h2>
        <p>Matched photos in a private gallery are visible only to the participant they were matched to.</p>

        <h2>4. Data retention</h2>
        <p>Event photos and embeddings are deleted when an event expires, unless the photographer extends the event.</p>

        <h2>5. Contact</h2>
        <p>Questions about your data can be sent to support@facefind.app.</p>
      </div>
    </Layout>
  );
}
