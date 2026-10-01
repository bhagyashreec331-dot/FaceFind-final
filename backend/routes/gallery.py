import io
import os
import zipfile
import requests

from flask import Blueprint, g, jsonify, send_file

from config import Config
from db import Event, Photo, SelfieMatch

from utils import storage
from utils.auth_utils import login_required


gallery_bp = Blueprint(
    "gallery",
    __name__,
    url_prefix="/api/gallery"
)


# ============================================================
# PHOTO PAYLOAD
# ============================================================

def _photo_payload(photo, similarity_score=None):

    payload = {
        "id": photo.id,

        "url": storage.get_signed_url(
            photo.storage_key
        ),

        # Falls back to the full image if no thumbnail was generated.
        "thumb_url": storage.get_signed_url(
            photo.thumb_storage_key or photo.storage_key
        ),
    }

    if similarity_score is not None:
        payload["similarity_score"] = similarity_score

    return payload


# ============================================================
# PUBLIC GALLERY
# ============================================================

@gallery_bp.get("/<event_id>/public")
def public_gallery(event_id):

    """
    Every public photo uploaded to the event.
    No login required.
    """

    photos = Photo.query.filter_by(
        event_id=event_id,
        is_public=True
    ).all()

    return jsonify(
        [
            _photo_payload(photo)
            for photo in photos
        ]
    )


# ============================================================
# PARTICIPANT PRIVATE GALLERY
# ============================================================

@gallery_bp.get("/<event_id>/private")
@login_required
def private_gallery(event_id):

    """
    Photos matched to the requesting participant's selfie only.

    Only PRIVATE photos are returned.
    Public photos must never appear in My Photos.
    """

    matches = (
        SelfieMatch.query.filter_by(
            event_id=event_id,
            user_id=g.user_id
        )
        .order_by(
            SelfieMatch.similarity_score.desc()
        )
        .all()
    )

    results = []

    for match in matches:

        photo = Photo.query.get(
            match.photo_id
        )

        # IMPORTANT:
        # Only include private photos.
        if not photo:
            continue

        if photo.event_id != event_id:
            continue

        if photo.is_public:
            continue

        results.append(
            _photo_payload(
                photo,
                match.similarity_score
            )
        )

    return jsonify(results)


# ============================================================
# PHOTOGRAPHER PRIVATE GALLERY
# ============================================================

@gallery_bp.get("/<event_id>/photographer-private")
@login_required
def photographer_private_gallery(event_id):

    """
    Shows only photos uploaded as PRIVATE by the
    event photographer.

    Public photos are NOT included here.
    """

    event = Event.query.get(
        event_id
    )

    if not event:
        return jsonify(
            message="Event not found."
        ), 404

    if event.owner_id != g.user_id:
        return jsonify(
            message="Only the event photographer can access this gallery."
        ), 403

    # IMPORTANT:
    # Only private uploaded photos belong in this gallery.
    photos = Photo.query.filter_by(
        event_id=event_id,
        is_public=False
    ).all()

    return jsonify(
        [
            _photo_payload(photo)
            for photo in photos
        ]
    )


# ============================================================
# ZIP HELPER
# ============================================================

def _zip_response(photos, zip_name):

    """
    Bundle the given photos into one ZIP file
    and stream it back.

    Works with Supabase, R2 and other storage
    backends by downloading each file through
    its signed URL.
    """

    buf = io.BytesIO()

    added_count = 0

    with zipfile.ZipFile(
        buf,
        "w",
        zipfile.ZIP_DEFLATED
    ) as zf:

        for i, photo in enumerate(
            photos,
            start=1
        ):

            # ------------------------------------------------
            # GET SIGNED URL
            # ------------------------------------------------

            try:

                signed_url = storage.get_signed_url(
                    photo.storage_key
                )

            except Exception:
                continue


            # ------------------------------------------------
            # DOWNLOAD ACTUAL IMAGE
            # ------------------------------------------------

            try:

                res = requests.get(
                    signed_url,
                    timeout=30
                )

                res.raise_for_status()

            except requests.RequestException:
                continue


            # ------------------------------------------------
            # FILE EXTENSION
            # ------------------------------------------------

            ext = "jpg"

            if "." in photo.storage_key:

                ext = (
                    photo.storage_key
                    .rsplit(".", 1)[-1]
                    .lower()
                )


            # ------------------------------------------------
            # ZIP FILE NAME
            # ------------------------------------------------

            arcname = (
                f"facefind-{i:03d}.{ext}"
            )


            # ------------------------------------------------
            # ADD IMAGE TO ZIP
            # ------------------------------------------------

            zf.writestr(
                arcname,
                res.content
            )

            added_count += 1


    # --------------------------------------------------------
    # DON'T RETURN AN EMPTY ZIP
    # --------------------------------------------------------

    if added_count == 0:

        return jsonify(
            message="Could not retrieve any photos from storage."
        ), 500


    # --------------------------------------------------------
    # SEND ZIP
    # --------------------------------------------------------

    buf.seek(0)

    return send_file(
        buf,
        mimetype="application/zip",
        as_attachment=True,
        download_name=zip_name
    )


# ============================================================
# PARTICIPANT PRIVATE ZIP
# ============================================================

@gallery_bp.get("/<event_id>/private/zip")
@login_required
def private_zip(event_id):

    """
    Download every PRIVATE photo matched to the
    requesting participant as one ZIP.
    """

    matches = SelfieMatch.query.filter_by(
        event_id=event_id,
        user_id=g.user_id
    ).all()


    # --------------------------------------------------------
    # GET ONLY VALID PRIVATE PHOTOS
    # --------------------------------------------------------

    photos = []

    for match in matches:

        photo = Photo.query.get(
            match.photo_id
        )

        if not photo:
            continue

        if photo.event_id != event_id:
            continue

        # Public photos must never be included
        # in participant private ZIP.
        if photo.is_public:
            continue

        photos.append(photo)


    # --------------------------------------------------------
    # NO PHOTOS
    # --------------------------------------------------------

    if not photos:

        return jsonify(
            message="No matched private photos to download yet."
        ), 404


    # --------------------------------------------------------
    # ZIP NAME
    # --------------------------------------------------------

    event = Event.query.get(
        event_id
    )

    name = (
        event.name
        if event
        else "event"
    ).replace(
        " ",
        "-"
    )


    # --------------------------------------------------------
    # CREATE ZIP
    # --------------------------------------------------------

    return _zip_response(
        photos,
        f"{name}-my-photos.zip"
    )


# ============================================================
# PUBLIC ZIP
# ============================================================

@gallery_bp.get("/<event_id>/public/zip")
def public_zip(event_id):

    """
    Download the whole public gallery as one ZIP.
    """

    photos = Photo.query.filter_by(
        event_id=event_id,
        is_public=True
    ).all()


    # --------------------------------------------------------
    # NO PUBLIC PHOTOS
    # --------------------------------------------------------

    if not photos:

        return jsonify(
            message="This event has no public photos yet."
        ), 404


    # --------------------------------------------------------
    # ZIP NAME
    # --------------------------------------------------------

    event = Event.query.get(
        event_id
    )

    name = (
        event.name
        if event
        else "event"
    ).replace(
        " ",
        "-"
    )


    # --------------------------------------------------------
    # CREATE ZIP
    # --------------------------------------------------------

    return _zip_response(
        photos,
        f"{name}-gallery.zip"
    )