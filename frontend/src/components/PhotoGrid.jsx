import { useCallback, useEffect, useState } from 'react';

import { downloadPhoto } from '../services/api';

export default function PhotoGrid({
  photos,
  isPhotographer = false,
  onDeletePhoto,
}) {
  const [openIndex, setOpenIndex] = useState(null);

  const close = useCallback(() => setOpenIndex(null), []);

  const step = useCallback(
    (dir) =>
      setOpenIndex((i) =>
        i === null ? i : (i + dir + photos.length) % photos.length
      ),
    [photos.length]
  );

  useEffect(() => {
    // Photographer does not use the preview/lightbox.
    if (isPhotographer) return undefined;

    if (openIndex === null) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };

    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIndex, close, step, isPhotographer]);

  const current = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <figure className="photo-card" key={p.id}>
            {isPhotographer ? (
              <>
                <div
                  className="photo-thumb"
                  aria-label={`Photo ${i + 1}`}
                  style={{ backgroundImage: `url(${p.thumb_url})` }}
                />

                <figcaption className="photo-actions">
                  <button
                    type="button"
                    className="photo-btn"
                    onClick={() => onDeletePhoto?.(p)}
                  >
                    Delete
                  </button>
                </figcaption>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="photo-thumb"
                  onClick={() => setOpenIndex(i)}
                  aria-label={`Preview photo ${i + 1}`}
                  style={{ backgroundImage: `url(${p.thumb_url})` }}
                />

                <figcaption className="photo-actions">
                  <button
                    type="button"
                    className="photo-btn"
                    onClick={() => setOpenIndex(i)}
                  >
                    Preview
                  </button>

                  <button
                    type="button"
                    className="photo-btn primary"
                    onClick={() => downloadPhoto(p, i)}
                  >
                    Download
                  </button>
                </figcaption>
              </>
            )}
          </figure>
        ))}
      </div>

      {/* Participant photo preview/lightbox */}
      {!isPhotographer && current && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={close}
        >
          <div
            className="lightbox-bar"
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              {openIndex + 1} of {photos.length}
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => downloadPhoto(current, openIndex)}
              >
                Download
              </button>

              <button
                type="button"
                className="btn lightbox-close"
                onClick={close}
              >
                Close
              </button>
            </div>
          </div>

          <div
            className="lightbox-stage"
            onClick={(e) => e.stopPropagation()}
          >
            {photos.length > 1 && (
              <button
                type="button"
                className="lightbox-nav prev"
                onClick={() => step(-1)}
                aria-label="Previous photo"
              >
                ‹
              </button>
            )}

            <img
              src={current.url}
              alt={`Event photo ${openIndex + 1}`}
            />

            {photos.length > 1 && (
              <button
                type="button"
                className="lightbox-nav next"
                onClick={() => step(1)}
                aria-label="Next photo"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}