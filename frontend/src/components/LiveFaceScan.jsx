import { useEffect, useRef, useState } from 'react';

export default function LiveFaceScan({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState(null); // data URL preview

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      } catch (err) {
        setError('Camera access was denied or is unavailable. Use "Upload selfie" instead.');
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'live-selfie.jpg', { type: 'image/jpeg' });
      setCaptured(canvas.toDataURL('image/jpeg'));
      onCapture(file);
    }, 'image/jpeg', 0.92);
  };

  const handleRetake = () => setCaptured(null);

  // The <video> element is unmounted while a captured photo is shown, so the
  // stream has to be re-attached when it comes back (otherwise Retake = black box).
  useEffect(() => {
    if (!captured && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [captured]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="scan-viewport">
        {captured ? (
          <img src={captured} alt="Captured selfie preview" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted />
        )}
        <div className="scan-corners">
          <span /><span /><span /><span />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {!captured ? (
        <button type="button" className="btn btn-primary" onClick={handleCapture} disabled={!ready}>
          {ready ? 'Capture' : 'Starting camera…'}
        </button>
      ) : (
        <button type="button" className="btn btn-outline" onClick={handleRetake}>
          Retake
        </button>
      )}
    </div>
  );
}
