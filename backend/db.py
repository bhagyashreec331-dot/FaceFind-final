import uuid
from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def gen_id():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # null for Google-only accounts
    role = db.Column(db.Enum("participant", "photographer", name="user_role"), nullable=False)
    google_id = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    name = db.Column(db.String(180), nullable=False)
    code = db.Column(db.String(24), unique=True, nullable=False)
    owner_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    photos = db.relationship("Photo", backref="event", lazy=True)


class Photo(db.Model):
    __tablename__ = "photos"

    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    event_id = db.Column(db.String(36), db.ForeignKey("events.id"), nullable=False)
    storage_key = db.Column(db.String(400), nullable=False)  # original, full-resolution
    thumb_storage_key = db.Column(db.String(400), nullable=True)  # compressed, for grid views
    is_public = db.Column(db.Boolean, default=True, nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Face embeddings detected in this photo, stored as JSON list of vectors
    face_embeddings = db.Column(db.JSON, nullable=True)


class SelfieMatch(db.Model):
    """Links a participant to the photos their selfie matched within an event."""

    __tablename__ = "selfie_matches"

    id = db.Column(db.String(36), primary_key=True, default=gen_id)
    event_id = db.Column(db.String(36), db.ForeignKey("events.id"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    photo_id = db.Column(db.String(36), db.ForeignKey("photos.id"), nullable=False)
    similarity_score = db.Column(db.Float, nullable=False)
    matched_at = db.Column(db.DateTime, default=datetime.utcnow)


def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
