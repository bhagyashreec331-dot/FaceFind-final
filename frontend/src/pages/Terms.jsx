import Layout from '../components/Layout';

export default function Terms() {
  return (
    <Layout>
      <div className="legal">
        <h2 style={{ marginTop: 0, fontSize: '1.6rem' }}>Terms & Conditions</h2>
        <p>These terms govern your use of FaceFind. By creating an account or joining an event, you agree to them.</p>

        <h2>1. Accounts</h2>
        <p>You're responsible for keeping your login credentials secure and for any activity under your account.</p>

        <h2>2. Photographer uploads</h2>
        <p>Photographers confirm they have the right to upload and process the event photos they submit, and to allow guests to view and download matched photos.</p>

        <h2>3. Face matching</h2>
        <p>Selfies and event photos are processed solely to generate facial embeddings for matching within the event you've joined. Matching accuracy is not guaranteed.</p>

        <h2>4. Event expiry</h2>
        <p>Event galleries and their photos are removed once an event's expiry period ends, unless the photographer extends it.</p>

        <h2>5. Changes</h2>
        <p>We may update these terms from time to time; continued use of FaceFind after changes means you accept the updated terms.</p>
      </div>
    </Layout>
  );
}
