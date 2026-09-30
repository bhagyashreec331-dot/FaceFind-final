import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Layout from '../components/Layout';
import LiveFaceScan from '../components/LiveFaceScan';
import PhotoGrid from '../components/PhotoGrid';

import {
  deleteAllPrivatePhotos,
  deleteAllPublicPhotos,
  deletePhoto,
  downloadGalleryZip,
  getEvent,
  getPrivateGallery,
  getPhotographerPrivateGallery,
  getPublicGallery,
  uploadSelfie,
} from '../services/api';

import { useAuth } from '../context/AuthContext';


export default function EventGallery() {
  const { eventId } = useParams();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [tab, setTab] = useState('public');

  const [publicPhotos, setPublicPhotos] = useState([]);
  const [publicLoading, setPublicLoading] = useState(true);

  const [selfieMode, setSelfieMode] = useState('live');
  const [selfieFile, setSelfieFile] = useState(null);

  const [privatePhotos, setPrivatePhotos] = useState([]);
  const [matching, setMatching] = useState(false);
  const [matched, setMatched] = useState(false);

  const [error, setError] = useState('');
  const [zipping, setZipping] = useState('');
  const [deleting, setDeleting] = useState('');

  const isPhotographer = user?.role === 'photographer';

  // Participant My Photos shows every photo matched to
  // the participant's face, whether the photographer uploaded
  // it as public or private.
  const matchedOnlyPhotos = privatePhotos;


  // ============================================================
  // LOAD EVENT + GALLERIES
  // ============================================================

  useEffect(() => {
    getEvent(eventId)
      .then(setEvent)
      .catch(() => {});

    getPublicGallery(eventId)
      .then(setPublicPhotos)
      .catch(() => setPublicPhotos([]))
      .finally(() => setPublicLoading(false));


    // Photographer:
    // Load ONLY private uploaded photos.
    if (isPhotographer) {
      getPhotographerPrivateGallery(eventId)
        .then(setPrivatePhotos)
        .catch(() => setPrivatePhotos([]));

      return;
    }


    // Participant:
    // Load previously matched photos.
    if (user) {
      getPrivateGallery(eventId)
        .then((matches) => {
          if (matches.length) {
            setPrivatePhotos(matches);
            setMatched(true);
          }
        })
        .catch(() => {});
    }

  }, [eventId, user, isPhotographer]);


  // ============================================================
  // PARTICIPANT SELFIE
  // ============================================================

  const submitSelfie = async (file) => {
    setError('');

    if (!file) {
      setError('Capture or choose a selfie first.');
      return;
    }

    setMatching(true);

    try {
      const formData = new FormData();

      formData.append('selfie', file);

      await uploadSelfie(
        eventId,
        formData
      );

      const matches =
        await getPrivateGallery(eventId);

      setPrivatePhotos(matches);
      setMatched(true);
      setTab('private');

    } catch (err) {
      setError(
        err.message ||
          'Could not process that selfie.'
      );

    } finally {
      setMatching(false);
    }
  };


  // ============================================================
  // PARTICIPANT DOWNLOAD
  // ============================================================

  const downloadAll = async (scope) => {
    setError('');
    setZipping(scope);

    try {
      await downloadGalleryZip(
        eventId,
        scope
      );

    } catch (err) {
      setError(
        err.message ||
          'Could not prepare the download.'
      );

    } finally {
      setZipping('');
    }
  };


  // ============================================================
  // PHOTOGRAPHER DELETE ONE PHOTO
  // ============================================================

  const handleDeletePhoto = async (photo) => {
    const confirmed = window.confirm(
      'Delete this photo?\n\nThis will permanently remove the photo, thumbnail, and related face-match data.'
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setDeleting(photo.id);

    try {
      await deletePhoto(
        eventId,
        photo.id
      );

      // Remove from private gallery if present.
      setPrivatePhotos((current) =>
        current.filter(
          (item) => item.id !== photo.id
        )
      );

      // Remove from public gallery if present.
      setPublicPhotos((current) =>
        current.filter(
          (item) => item.id !== photo.id
        )
      );

      // One photo was permanently deleted.
      setEvent((current) =>
        current
          ? {
              ...current,
              photo_count: Math.max(
                0,
                (current.photo_count || 0) - 1
              ),
            }
          : current
      );

    } catch (err) {
      setError(
        err.message ||
          'Could not delete the photo.'
      );

    } finally {
      setDeleting('');
    }
  };


  // ============================================================
  // PHOTOGRAPHER DELETE ALL
  // ============================================================

  const handleDeleteAllPhotos = async (scope) => {
    const photosToDelete =
      scope === 'public'
        ? publicPhotos
        : privatePhotos;

    if (photosToDelete.length === 0) {
      return;
    }

    const galleryName =
      scope === 'public'
        ? 'public'
        : 'private';

    const confirmed = window.confirm(
      `Delete all ${photosToDelete.length} ${galleryName} photos?\n\nThis will permanently remove the uploaded photos, thumbnails, and related face-match data. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setDeleting(`${scope}-all`);

    try {
      if (scope === 'public') {
        await deleteAllPublicPhotos(eventId);

        setPublicPhotos([]);

      } else {
        await deleteAllPrivatePhotos(eventId);

        setPrivatePhotos([]);
      }

      // Only subtract the photos that were actually
      // deleted from this gallery.
      setEvent((current) =>
        current
          ? {
              ...current,
              photo_count: Math.max(
                0,
                (current.photo_count || 0) -
                  photosToDelete.length
              ),
            }
          : current
      );

    } catch (err) {
      setError(
        err.message ||
          `Could not delete the ${galleryName} photos.`
      );

    } finally {
      setDeleting('');
    }
  };


  return (
    <Layout>

      <div className="container section">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="dash-head">

          <div>

            <h2>
              {event?.name || 'Event gallery'}
            </h2>

            <p>
              {event
                ? `${event.photo_count || 0} photos in this event`
                : `Event ID: ${eventId}`}
            </p>

          </div>

        </div>


        {/* ======================================================
            TABS
        ====================================================== */}

        <div className="tabs">

          <button
            className={
              tab === 'public'
                ? 'active'
                : ''
            }
            onClick={() => {
              setTab('public');
              setError('');
            }}
          >
            Public gallery
          </button>


          <button
            className={
              tab === 'private'
                ? 'active'
                : ''
            }
            onClick={() => {
              setTab('private');
              setError('');
            }}
          >
            {isPhotographer
              ? 'Private Gallery'
              : 'My photos'}
          </button>

        </div>


        {/* ======================================================
            PUBLIC GALLERY
        ====================================================== */}

        {tab === 'public' && (

          <div>

            {error && (
              <div
                className="form-error"
                role="alert"
              >
                {error}
              </div>
            )}


            {publicLoading ? (

              <p>Loading photos…</p>

            ) : publicPhotos.length === 0 ? (

              <div className="empty-state">
                No public photos have been
                uploaded to this event yet.
              </div>

            ) : (

              <>

                <div className="gallery-toolbar">

                  <p>
                    {publicPhotos.length}{' '}
                    public photo
                    {publicPhotos.length === 1
                      ? ''
                      : 's'}
                    .
                    {isPhotographer
                      ? ' Manage your uploaded photos.'
                      : ' Preview any photo or download it.'}
                  </p>


                  {isPhotographer ? (

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        handleDeleteAllPhotos(
                          'public'
                        )
                      }
                      disabled={
                        deleting === 'public-all'
                      }
                    >
                      {deleting === 'public-all'
                        ? 'Deleting…'
                        : 'Delete all'}
                    </button>

                  ) : (

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        downloadAll('public')
                      }
                      disabled={
                        zipping === 'public'
                      }
                    >
                      {zipping === 'public'
                        ? 'Preparing zip…'
                        : 'Download all'}
                    </button>

                  )}

                </div>


                <PhotoGrid
                  photos={publicPhotos}
                  isPhotographer={
                    isPhotographer
                  }
                  onDeletePhoto={
                    isPhotographer
                      ? handleDeletePhoto
                      : undefined
                  }
                />

              </>

            )}

          </div>

        )}


        {/* ======================================================
            PRIVATE GALLERY
        ====================================================== */}

        {tab === 'private' && (

          <div>

            {/* ==================================================
                PHOTOGRAPHER PRIVATE GALLERY
            ================================================== */}

            {isPhotographer ? (

              <div>

                {error && (
                  <div
                    className="form-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}


                {privatePhotos.length === 0 ? (

                  <div className="empty-state">
                    No private photos have been
                    uploaded to this event yet.
                  </div>

                ) : (

                  <>

                    <div className="gallery-toolbar">

                      <p>
                        {privatePhotos.length}{' '}
                        private uploaded photo
                        {privatePhotos.length === 1
                          ? ''
                          : 's'}.
                      </p>


                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() =>
                          handleDeleteAllPhotos(
                            'private'
                          )
                        }
                        disabled={
                          deleting === 'private-all'
                        }
                      >
                        {deleting === 'private-all'
                          ? 'Deleting…'
                          : 'Delete all'}
                      </button>

                    </div>


                    <PhotoGrid
                      photos={privatePhotos}
                      isPhotographer={true}
                      onDeletePhoto={
                        handleDeletePhoto
                      }
                    />

                  </>

                )}

              </div>

            ) : (

              /* ==================================================
                 PARTICIPANT PRIVATE GALLERY
                 ================================================== */

              <>

                {!user ? (

                  <div className="empty-state">

                    <p
                      style={{
                        marginBottom: 16,
                      }}
                    >
                      Sign in to scan or upload a
                      selfie and see photos matched
                      to you.
                    </p>


                    <Link
                      to="/login"
                      state={{
                        from:
                          `/event/${eventId}`,
                      }}
                      className="btn btn-primary"
                    >
                      Sign in
                    </Link>

                  </div>

                ) : !matched ? (

                  <div
                    className="empty-state"
                    style={{
                      textAlign: 'left',
                      maxWidth: 420,
                      margin: '0 auto',
                    }}
                  >

                    {error && (
                      <div
                        className="form-error"
                        role="alert"
                      >
                        {error}
                      </div>
                    )}


                    <p
                      style={{
                        marginBottom: 16,
                        textAlign: 'center',
                      }}
                    >
                      Find yourself with a live
                      scan or an uploaded selfie.
                    </p>


                    <div className="segment-toggle">

                      <button
                        type="button"
                        className={
                          selfieMode === 'live'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setSelfieMode('live')
                        }
                      >
                        Live scan
                      </button>


                      <button
                        type="button"
                        className={
                          selfieMode === 'upload'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setSelfieMode('upload')
                        }
                      >
                        Upload selfie
                      </button>

                    </div>


                    {selfieMode === 'live' ? (

                      <LiveFaceScan
                        onCapture={(file) => {
                          setSelfieFile(file);
                          submitSelfie(file);
                        }}
                      />

                    ) : (

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitSelfie(
                            selfieFile
                          );
                        }}
                      >

                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={(e) =>
                            setSelfieFile(
                              e.target.files[0]
                            )
                          }
                          style={{
                            marginBottom: 16,
                          }}
                        />


                        <div>

                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={matching}
                          >
                            {matching
                              ? 'Matching your face…'
                              : 'Upload selfie'}
                          </button>

                        </div>

                      </form>

                    )}


                    {matching &&
                      selfieMode === 'live' && (
                        <p
                          style={{
                            marginTop: 12,
                          }}
                        >
                          Matching your face…
                        </p>
                      )}

                  </div>

                ) : matchedOnlyPhotos.length === 0 ? (

                  <div className="empty-state">
                    No matches yet. Photos with
                    your face will show up here once
                    the photographer uploads them.
                  </div>

                ) : (

                  <div>

                    {error && (
                      <div
                        className="form-error"
                        role="alert"
                      >
                        {error}
                      </div>
                    )}


                    <div className="gallery-toolbar">

                      <p>
                        {matchedOnlyPhotos.length}{' '}
                        photo
                        {matchedOnlyPhotos.length === 1
                          ? ''
                          : 's'} matched to you.
                        Only you can see these.
                      </p>


                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                        }}
                      >

                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            setMatched(false);
                            setSelfieFile(null);
                          }}
                        >
                          Scan again
                        </button>


                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            downloadAll(
                              'private'
                            )
                          }
                          disabled={
                            zipping === 'private'
                          }
                        >
                          {zipping === 'private'
                            ? 'Preparing zip…'
                            : 'Download all'}
                        </button>

                      </div>

                    </div>


                    <PhotoGrid
                      photos={matchedOnlyPhotos}
                      isPhotographer={false}
                    />

                  </div>

                )}

              </>

            )}

          </div>

        )}

      </div>

    </Layout>
  );
}