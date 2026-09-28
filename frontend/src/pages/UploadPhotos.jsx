import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { uploadEventPhotos } from '../services/api';

export default function UploadPhotos() {
  const { eventId } = useParams();
  const [visibility, setVisibility] = useState('public');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    if (files.length === 0) {
      setError('Choose at least one photo to upload.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));
      formData.append('visibility', visibility);
      const data = await uploadEventPhotos(eventId, formData);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Upload failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container section" style={{ maxWidth: 640 }}>
        <div className="section-head">
          <h2>Upload event photos</h2>
          <p>Photos are run through AI face processing so guests can be matched automatically.</p>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        {result ? (
          <div className="corner-card">
            <h3 style={{ marginBottom: 8, fontSize: '1.05rem' }}>{result.uploaded} photo(s) uploaded</h3>
            <p style={{ marginBottom: 20 }}>
              {visibility === 'public'
                ? "They're now visible in the public gallery and searchable against guest selfies."
                : "They're kept out of the public gallery, but still searchable — only guests whose selfie matches will see them."}
            </p>
            <Link to="/dashboard/photographer" className="btn btn-primary">Back to dashboard</Link>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="corner-card">
            <div className="field">
              <label>Where should these photos go?</label>
              <div className="segment-toggle">
                <button
                  type="button"
                  className={visibility === 'public' ? 'active' : ''}
                  onClick={() => setVisibility('public')}
                >
                  Public gallery
                </button>
                <button
                  type="button"
                  className={visibility === 'private' ? 'active' : ''}
                  onClick={() => setVisibility('private')}
                >
                  Private (match-only)
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: -10, marginBottom: 20 }}>
                {visibility === 'public'
                  ? 'Anyone who joins this event can browse and download these.'
                  : "Hidden from the open gallery. Only shown to a guest if their uploaded selfie matches."}
              </p>
            </div>

            <div className="field">
              <label htmlFor="photos">Select photos</label>
              <input
                id="photos"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files))}
              />
            </div>
            {files.length > 0 && <p style={{ marginBottom: 16 }}>{files.length} file(s) selected.</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Uploading & processing…' : 'Upload photos'}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
