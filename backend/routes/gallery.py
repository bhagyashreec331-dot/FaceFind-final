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


def _photo_payload(photo, similarity_score=None):
    payload = {
        "id": photo.id,
        "url": storage.get_signed_url(photo.storage_key),
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
        [_photo_payload(photo) for photo in photos]
    )


# ============================================================
# PARTICIPANT PRIVATE GALLERY
# ============================================================

@gallery_bp.get("/<event_id>/private")
@login_required
def private_gallery(event_id):
    """
    Photos matched to the requesting participant's selfie only.
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
        photo = Photo.query.get(match.photo_id)

        if photo:
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
    Shows only photos uploaded as PRIVATE by the event photographer.
    Public photos are NOT included here.
    """

    event = Event.query.get(event_id)

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
        [_photo_payload(photo) for photo in photos]
    )


# ============================================================
# ZIP HELPER
# ============================================================

def _zip_response(photos, zip_name):
    """
    Bundle the given photos into one ZIP file
    and stream it back.
    """

    buf = io.BytesIO()

    with zipfile.ZipFile(
        buf,
        "w",
        zipfile.ZIP_STORED
    ) as zf:

        for i, photo in enumerate(
            photos,
            start=1
        ):

            ext = photo.storage_key.rsplit(
                ".",
                1
            )[-1]

            arcname = f"facefind-{i:03d}.{ext}"

            if Config.STORAGE_BACKEND == "r2":

                res = requests.get(
                    storage.get_signed_url(
                        photo.storage_key
                    ),
                    timeout=30
                )

                if res.ok:
                    zf.writestr(
                        arcname,
                        res.content
                    )

            else:

                basedir = os.path.abspath(
                    os.path.dirname(
                        os.path.dirname(
                            __file__
                        )
                    )
                )

                path = os.path.join(
                    basedir,
                    Config.LOCAL_STORAGE_DIR,
                    photo.storage_key
                )

                if os.path.exists(path):
                    zf.write(
                        path,
                        arcname
                    )

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
    Download every photo matched to the requesting participant
    as one ZIP.
    """

    matches = SelfieMatch.query.filter_by(
        event_id=event_id,
        user_id=g.user_id
    ).all()

    photos = [
        Photo.query.get(match.photo_id)
        for match in matches
    ]

    photos = [
        photo
        for photo in photos
        if photo
    ]

    if not photos:
        return jsonify(
            message="No matched photos to download yet."
        ), 404

    event = Event.query.get(event_id)

    name = (
        event.name
        if event
        else "event"
    ).replace(
        " ",
        "-"
    )

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

    if not photos:
        return jsonify(
            message="This event has no public photos yet."
        ), 404

    event = Event.query.get(event_id)

    name = (
        event.name
        if event
        else "event"
    ).replace(
        " ",
        "-"
    )

    return _zip_response(
        photos,
        f"{name}-gallery.zip"
    )