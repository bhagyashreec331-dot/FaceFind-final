const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

function getToken() {
  return window.localStorage.getItem('facefind-token');
}

function friendlyNetworkError(err) {
  if (err instanceof TypeError) {
    return new Error(
      `Can't reach the FaceFind server at ${BASE_URL}. Make sure the backend is running (cd backend && python app.py).`
    );
  }

  return err;
}

async function request(path, options = {}) {
  const token = getToken();
  let res;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });
  } catch (err) {
    throw friendlyNetworkError(err);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.message || 'Something went wrong.'
    );
  }

  return data;
}


async function uploadRequest(path, formData) {
  const token = getToken();
  let res;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    });
  } catch (err) {
    throw friendlyNetworkError(err);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.message || 'Upload failed.'
    );
  }

  return data;
}


// ============================================================
// AUTH
// ============================================================

export const login = (payload) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });


export const register = (payload) =>
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });


export const requestPasswordReset = (email) =>
  request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });


export const resetPassword = (payload) =>
  request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });


export const googleLogin = (role) => {
  const suffix = role
    ? `?role=${encodeURIComponent(role)}`
    : '';

  window.location.href =
    `${BASE_URL}/auth/google${suffix}`;
};


// ============================================================
// ACCOUNT
// ============================================================

export const updateProfile = (payload) =>
  request('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });


export const changePassword = (payload) =>
  request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });


export const deleteAccount = (payload) =>
  request('/auth/me', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });


// ============================================================
// EVENTS
// ============================================================

export const createEvent = (payload) =>
  request('/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });


export const joinEvent = (code) =>
  request(
    `/events/join/${encodeURIComponent(code)}`,
    {
      method: 'POST',
    }
  );


export const getEvent = (eventId) =>
  request(`/events/${eventId}`);


export const listMyEvents = () =>
  request('/events/mine');


// Delete an event created by the logged-in photographer.
export const deleteEvent = (eventId) =>
  request(`/events/${eventId}`, {
    method: 'DELETE',
  });


// ============================================================
// PHOTOS
// ============================================================

export const uploadEventPhotos = (
  eventId,
  formData
) =>
  uploadRequest(
    `/photos/${eventId}/upload`,
    formData
  );


export const uploadSelfie = (
  eventId,
  formData
) =>
  uploadRequest(
    `/photos/${eventId}/selfie`,
    formData
  );


// Delete one photo.
export const deletePhoto = (
  eventId,
  photoId
) =>
  request(
    `/photos/${eventId}/${photoId}`,
    {
      method: 'DELETE',
    }
  );


// Delete ALL PUBLIC photos.
export const deleteAllPublicPhotos = (
  eventId
) =>
  request(
    `/photos/${eventId}/all/public`,
    {
      method: 'DELETE',
    }
  );


// Delete ALL PRIVATE photos.
export const deleteAllPrivatePhotos = (
  eventId
) =>
  request(
    `/photos/${eventId}/all/private`,
    {
      method: 'DELETE',
    }
  );


// ============================================================
// GALLERY
// ============================================================

export const getPublicGallery = (
  eventId
) =>
  request(
    `/gallery/${eventId}/public`
  );


// Participant's matched/private photos.
export const getPrivateGallery = (
  eventId
) =>
  request(
    `/gallery/${eventId}/private`
  );


// Photographer's private uploaded photos.
export const getPhotographerPrivateGallery = (
  eventId
) =>
  request(
    `/gallery/${eventId}/photographer-private`
  );


// ============================================================
// DOWNLOADS
// ============================================================

// Participant/public gallery ZIP downloads.
// Photographer does NOT use these for deletion.
export async function downloadGalleryZip(
  eventId,
  scope
) {
  const token = getToken();
  let res;

  try {
    res = await fetch(
      `${BASE_URL}/gallery/${eventId}/${scope}/zip`,
      {
        headers: token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {},
      }
    );
  } catch (err) {
    throw friendlyNetworkError(err);
  }

  if (!res.ok) {
    const data =
      await res.json().catch(() => ({}));

    throw new Error(
      data.message ||
        'Could not prepare the download.'
    );
  }

  const blob = await res.blob();

  saveBlob(
    blob,
    `facefind-${scope}-photos.zip`
  );
}


// ============================================================
// FILE DOWNLOAD HELPERS
// ============================================================

export function saveBlob(
  blob,
  filename
) {
  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);

  a.click();

  a.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}


// Saves a single participant/public photo.
export async function downloadPhoto(
  photo,
  index = 0
) {
  try {
    const res =
      await fetch(photo.url);

    if (!res.ok) {
      throw new Error(
        'fetch failed'
      );
    }

    const blob =
      await res.blob();

    const ext = (
      blob.type.split('/')[1] ||
      'jpg'
    ).replace(
      'jpeg',
      'jpg'
    );

    saveBlob(
      blob,
      `facefind-${String(
        index + 1
      ).padStart(
        3,
        '0'
      )}.${ext}`
    );

  } catch {
    window.open(
      photo.url,
      '_blank',
      'noopener'
    );
  }
}