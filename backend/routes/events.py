import logging
import secrets

from datetime import datetime

from flask import Blueprint, g, jsonify, request

from db import Event, Photo, SelfieMatch, db

from utils import storage
from utils.auth_utils import login_required, role_required


events_bp = Blueprint(
    "events",
    __name__,
    url_prefix="/api/events"
)

logger = logging.getLogger("facefind.events")


def generate_event_code():
    return secrets.token_hex(4).upper()


# ============================================================
# CREATE EVENT
# ============================================================

@events_bp.post("")
@login_required
@role_required("photographer")
def create_event():

    data = request.get_json(force=True)

    name = (data.get("name") or "").strip()
    expires_at = data.get("expires_at")

    if not name:
        return jsonify(
            message="Event name is required."
        ), 400

    code = generate_event_code()

    while Event.query.filter_by(code=code).first():
        code = generate_event_code()

    event = Event(
        name=name,
        code=code,
        owner_id=g.user_id,
        expires_at=(
            datetime.fromisoformat(expires_at)
            if expires_at
            else None
        ),
    )

    db.session.add(event)
    db.session.commit()

    logger.info(
        "Event created: %s (%s) by %s",
        event.name,
        event.code,
        g.user_id
    )

    return jsonify(
        id=event.id,
        name=event.name,
        code=event.code,
        join_link=f"/join-event?code={event.code}",
    ), 201


# ============================================================
# JOIN EVENT
# ============================================================

@events_bp.post("/join/<code>")
@login_required
def join_event(code):

    event = Event.query.filter_by(
        code=code.strip().upper()
    ).first()

    if not event:
        return jsonify(
            message="No event found for that code."
        ), 404

    if (
        event.expires_at
        and event.expires_at < datetime.utcnow()
    ):
        return jsonify(
            message="This event has expired."
        ), 410

    return jsonify(
        id=event.id,
        name=event.name,
        code=event.code
    )


# ============================================================
# GET EVENT
# ============================================================

@events_bp.get("/<event_id>")
def get_event(event_id):

    event = Event.query.get(event_id)

    if not event:
        return jsonify(
            message="Event not found."
        ), 404

    # Number of participant/photo face matches
    # recorded for this event.
    faces_matched = SelfieMatch.query.filter_by(
        event_id=event_id
    ).count()

    return jsonify(
        id=event.id,
        name=event.name,
        code=event.code,
        expires_at=(
            event.expires_at.isoformat()
            if event.expires_at
            else None
        ),
        photo_count=len(event.photos),
        faces_matched=faces_matched,
    )


# ============================================================
# LIST MY EVENTS
# ============================================================

@events_bp.get("/mine")
@login_required
@role_required("photographer")
def list_my_events():

    events = Event.query.filter_by(
        owner_id=g.user_id
    ).all()

    return jsonify([
        {
            "id": e.id,
            "name": e.name,
            "code": e.code,
            "photo_count": len(e.photos),
            "faces_matched": SelfieMatch.query.filter_by(
                event_id=e.id
            ).count(),
        }
        for e in events
    ])


# ============================================================
# DELETE EVENT
# ============================================================

@events_bp.delete("/<event_id>")
@login_required
@role_required("photographer")
def delete_event(event_id):
    """Delete an event and all of its associated data.

    Only the photographer who created the event can delete it.
    """

    event = Event.query.get(event_id)

    if not event:
        return jsonify(
            message="Event not found."
        ), 404

    # Security check:
    # only the event owner can delete the event.
    if event.owner_id != g.user_id:
        return jsonify(
            message="You don't have permission to delete this event."
        ), 403

    # Get all event photos before deleting the database records.
    photos = Photo.query.filter_by(
        event_id=event_id
    ).all()

    # Delete photo files and thumbnails from storage.
    for photo in photos:

        if photo.storage_key:
            storage.delete_file(
                photo.storage_key
            )

        if photo.thumb_storage_key:
            storage.delete_file(
                photo.thumb_storage_key
            )

    # Delete face-match records.
    SelfieMatch.query.filter_by(
        event_id=event_id
    ).delete(
        synchronize_session=False
    )

    # Delete photo records.
    Photo.query.filter_by(
        event_id=event_id
    ).delete(
        synchronize_session=False
    )

    # Finally delete the event.
    db.session.delete(event)

    db.session.commit()

    logger.info(
        "Event deleted: %s by %s",
        event_id,
        g.user_id
    )

    return jsonify(
        message="Event deleted successfully."
    )