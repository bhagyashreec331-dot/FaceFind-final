import logging
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Blueprint, g, jsonify, request

from config import Config
from db import Event, Photo, SelfieMatch, db
from utils import face_utils, image_utils, storage
from utils.auth_utils import login_required, role_required


photos_bp = Blueprint(
    "photos",
    __name__,
    url_prefix="/api/photos"
)

logger = logging.getLogger("facefind.photos")

# Photos in one upload batch are processed in parallel.
MAX_WORKERS = 4


def _process_single_photo(
    file_bytes,
    filename,
    mimetype,
    event_id,
    is_public,
):
    """Runs in a worker thread: validate, thumbnail, extract embeddings, store."""

    valid, error = storage.is_valid_image(
        filename,
        len(file_bytes),
    )

    if not valid:
        return {
            "filename": filename,
            "error": error,
        }

    suffix = os.path.splitext(filename)[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix,
    ) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    thumb_path = None

    try:
        embeddings = face_utils.extract_embeddings(tmp_path)

        storage_key = storage.build_storage_key(
            event_id,
            filename,
        )

        storage.upload_file(
            tmp_path,
            storage_key,
            content_type=mimetype,
        )

        thumb_key = None

        try:
            thumb_path = image_utils.create_thumbnail(tmp_path)

            thumb_key = storage.build_storage_key(
                event_id,
                filename,
                prefix="thumbs",
            )

            storage.upload_file(
                thumb_path,
                thumb_key,
                content_type="image/jpeg",
            )

        except Exception:
            logger.exception(
                "Thumbnail generation failed for %s, continuing without one",
                filename,
            )

        return {
            "filename": filename,
            "storage_key": storage_key,
            "thumb_key": thumb_key,
            "embeddings": embeddings,
            "is_public": is_public,
        }

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

        if thumb_path and os.path.exists(thumb_path):
            os.remove(thumb_path)


# ============================================================
# UPLOAD EVENT PHOTOS
# ============================================================

@photos_bp.post("/<event_id>/upload")
@login_required
@role_required("photographer")
def upload_event_photos(event_id):
    """
    Photographer uploads one or more event photos.
    Only the event owner can upload.
    """

    event = Event.query.get(event_id)

    if not event:
        return jsonify(
            message="Event not found."
        ), 404

    if event.owner_id != g.user_id:
        return jsonify(
            message="You don't have permission to upload to this event."
        ), 403

    files = request.files.getlist("photos")

    if not files:
        return jsonify(
            message="No photos were provided."
        ), 400

    # Public by default.
    # If visibility=private is supplied, the photo is private.
    is_public = (
        request.form.get("visibility", "public") != "private"
    )

    jobs = [
        (
            f.read(),
            f.filename,
            f.mimetype,
        )
        for f in files
    ]

    results = []

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as pool:

        futures = [
            pool.submit(
                _process_single_photo,
                data,
                filename,
                mimetype,
                event_id,
                is_public,
            )
            for data, filename, mimetype in jobs
        ]

        for future in as_completed(futures):
            results.append(
                future.result()
            )

    created = []
    skipped = []

    for result in results:

        if result.get("error"):
            skipped.append(
                {
                    "filename": result["filename"],
                    "reason": result["error"],
                }
            )
            continue

        photo = Photo(
            event_id=event_id,
            storage_key=result["storage_key"],
            thumb_storage_key=result["thumb_key"],
            face_embeddings=result["embeddings"],
            is_public=result["is_public"],
        )

        db.session.add(photo)
        created.append(photo)

    db.session.commit()

    logger.info(
        "Uploaded %d photo(s) to event %s (%d skipped)",
        len(created),
        event_id,
        len(skipped),
    )

    return jsonify(
        uploaded=len(created),
        photo_ids=[p.id for p in created],
        skipped=skipped,
    ), 201


# ============================================================
# DELETE ONE PHOTO
# ============================================================

@photos_bp.delete("/<event_id>/<photo_id>")
@login_required
@role_required("photographer")
def delete_event_photo(event_id, photo_id):
    """
    Delete one uploaded photo completely.

    Deletes:
    - original image
    - thumbnail
    - selfie match records
    - database record
    """

    event = Event.query.get(event_id)

    if not event:
        return jsonify(
            message="Event not found."
        ), 404

    if event.owner_id != g.user_id:
        return jsonify(
            message="You don't have permission to delete photos from this event."
        ), 403

    photo = Photo.query.filter_by(
        id=photo_id,
        event_id=event_id,
    ).first()

    if not photo:
        return jsonify(
            message="Photo not found."
        ), 404

    try:
        # Delete participant face-match records first.
        SelfieMatch.query.filter_by(
            photo_id=photo.id
        ).delete(
            synchronize_session=False
        )

        # Delete original image.
        if photo.storage_key:
            storage.delete_file(
                photo.storage_key
            )

        # Delete thumbnail.
        if photo.thumb_storage_key:
            storage.delete_file(
                photo.thumb_storage_key
            )

        # Delete database record.
        db.session.delete(photo)

        db.session.commit()

        logger.info(
            "Deleted photo %s from event %s",
            photo_id,
            event_id,
        )

        return jsonify(
            message="Photo deleted successfully."
        )

    except Exception:
        db.session.rollback()

        logger.exception(
            "Failed to delete photo %s from event %s",
            photo_id,
            event_id,
        )

        return jsonify(
            message="Failed to delete photo."
        ), 500


# ============================================================
# DELETE ALL PUBLIC PHOTOS
# ============================================================

@photos_bp.delete("/<event_id>/all/public")
@login_required
@role_required("photographer")
def delete_all_public_photos(event_id):
    """
    Delete all PUBLIC photos from the event.

    Deletes:
    - original images
    - thumbnails
    - selfie match records
    - database records
    """

    event = Event.query.get(event_id)

    if not event:
        return jsonify(
            message="Event not found."
        ), 404

    if event.owner_id != g.user_id:
        return jsonify(
            message="You don't have permission to delete photos from this event."
        ), 403

    photos = Photo.query.filter_by(
        event_id=event_id,
        is_public=True,
    ).all()

    if not photos:
        return jsonify(
            message="There are no public photos to delete.",
            deleted=0,
        )

    deleted_count = 0

    try:
        for photo in photos:

            # Delete participant face-match records.
            SelfieMatch.query.filter_by(
                photo_id=photo.id
            ).delete(
                synchronize_session=False
            )

            # Delete original photo.
            if photo.storage_key:
                storage.delete_file(
                    photo.storage_key
                )

            # Delete thumbnail.
            if photo.thumb_storage_key:
                storage.delete_file(
                    photo.thumb_storage_key
                )

            # Delete database record.
            db.session.delete(photo)

            deleted_count += 1

        db.session.commit()

        logger.info(
            "Deleted %d public photos from event %s",
            deleted_count,
            event_id,
        )

        return jsonify(
            message="All public photos deleted successfully.",
            deleted=deleted_count,
        )

    except Exception:
        db.session.rollback()

        logger.exception(
            "Failed to delete public photos from event %s",
            event_id,
        )

        return jsonify(
            message="Failed to delete public photos."
        ), 500


# ============================================================
# DELETE ALL PRIVATE PHOTOS
# ============================================================

@photos_bp.delete("/<event_id>/all/private")
@login_required
@role_required("photographer")
def delete_all_private_photos(event_id):
    """
    Delete all PRIVATE photos from the event.

    Deletes:
    - original images
    - thumbnails
    - selfie match records
    - database records
    """

    event = Event.query.get(event_id)

    if not event:
        return jsonify(
            message="Event not found."
        ), 404

    if event.owner_id != g.user_id:
        return jsonify(
            message="You don't have permission to delete photos from this event."
        ), 403

    photos = Photo.query.filter_by(
        event_id=event_id,
        is_public=False,
    ).all()

    if not photos:
        return jsonify(
            message="There are no private photos to delete.",
            deleted=0,
        )

    deleted_count = 0

    try:
        for photo in photos:

            # Delete participant face-match records.
            SelfieMatch.query.filter_by(
                photo_id=photo.id
            ).delete(
                synchronize_session=False
            )

            # Delete original photo.
            if photo.storage_key:
                storage.delete_file(
                    photo.storage_key
                )

            # Delete thumbnail.
            if photo.thumb_storage_key:
                storage.delete_file(
                    photo.thumb_storage_key
                )

            # Delete database record.
            db.session.delete(photo)

            deleted_count += 1

        db.session.commit()

        logger.info(
            "Deleted %d private photos from event %s",
            deleted_count,
            event_id,
        )

        return jsonify(
            message="All private photos deleted successfully.",
            deleted=deleted_count,
        )

    except Exception:
        db.session.rollback()

        logger.exception(
            "Failed to delete private photos from event %s",
            event_id,
        )

        return jsonify(
            message="Failed to delete private photos."
        ), 500


# ============================================================
# PARTICIPANT SELFIE / FACE MATCHING
# ============================================================

@photos_bp.post("/<event_id>/selfie")
@login_required
def upload_selfie(event_id):
    """
    Participant uploads a selfie and matches it against
    photos belonging to the event.
    """

    event = Event.query.get(event_id)

    if not event:
        return jsonify(
            message="Event not found."
        ), 404

    if not face_utils.FACE_ENGINE_AVAILABLE:
        return jsonify(
            message=(
                "Face matching isn't enabled on this server. "
                "Install InsightFace (see requirements-full.txt)."
            )
        ), 503

    file = request.files.get("selfie")

    if not file:
        return jsonify(
            message="A selfie file is required."
        ), 400

    valid, error = storage.is_valid_image(
        file.filename,
        _file_size(file),
    )

    if not valid:
        return jsonify(
            message=error
        ), 400

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=os.path.splitext(file.filename)[1],
    ) as tmp:

        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        selfie_embedding = face_utils.extract_selfie_embedding(
            tmp_path
        )

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    if selfie_embedding is None:
        return jsonify(
            message=(
                "No face was detected in that selfie. "
                "Try a clearer, front-facing photo."
            )
        ), 422

    photo_embeddings = {
    photo.id: (
        photo.face_embeddings or []
    )
    for photo in Photo.query.filter_by(
        event_id=event_id,
    ).all()
}

    matches = face_utils.find_matches_for_selfie(
        selfie_embedding,
        photo_embeddings,
        threshold=Config.FACE_SIMILARITY_THRESHOLD,
    )

    for match in matches:

        existing = SelfieMatch.query.filter_by(
            event_id=event_id,
            user_id=g.user_id,
            photo_id=match["photo_id"],
        ).first()

        if not existing:
            db.session.add(
                SelfieMatch(
                    event_id=event_id,
                    user_id=g.user_id,
                    photo_id=match["photo_id"],
                    similarity_score=match["similarity_score"],
                )
            )

    db.session.commit()

    logger.info(
        "Selfie matched %d photo(s) for user %s in event %s",
        len(matches),
        g.user_id,
        event_id,
    )

    return jsonify(
        matched_photos=len(matches)
    )


def _file_size(file_storage):
    file_storage.stream.seek(
        0,
        os.SEEK_END
    )

    size = file_storage.stream.tell()

    file_storage.stream.seek(0)

    return size