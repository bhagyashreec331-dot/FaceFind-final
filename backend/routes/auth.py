import logging
import secrets
from datetime import datetime, timedelta

import bcrypt
import jwt
import requests
from flask import Blueprint, jsonify, redirect, request

from config import Config
from db import User, db
from extensions import limiter
from utils.auth_utils import decode_token, get_bearer_token, login_required
from utils.mailer import send_password_reset_email

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
logger = logging.getLogger("facefind.auth")

# In-memory store for password reset tokens.
# Swap for a DB table (or Redis) in production — this resets on server restart.
_reset_tokens = {}


def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def issue_token(user):
    payload = {
        "sub": user.id,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(hours=Config.JWT_EXP_HOURS),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def user_public(user):
    return {"id": user.id, "name": user.name, "role": user.role, "email": user.email}


@auth_bp.post("/register")
@limiter.limit("10 per hour")
def register():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role")

    if not name or not email or not password:
        return jsonify(message="Name, email and password are required."), 400
    if role not in ("participant", "photographer"):
        return jsonify(message="Role must be 'participant' or 'photographer'."), 400
    if len(password) < 8:
        return jsonify(message="Password must be at least 8 characters."), 400
    if User.query.filter_by(email=email).first():
        return jsonify(message="An account with this email already exists."), 409

    user = User(name=name, email=email, password_hash=hash_password(password), role=role)
    db.session.add(user)
    db.session.commit()
    logger.info("New %s account registered: %s", role, email)

    # Deliberately not issuing a session token here — registration and
    # sign-in are kept as two separate steps.
    return jsonify(user=user_public(user)), 201


@auth_bp.post("/login")
@limiter.limit("20 per hour")
def login():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        return jsonify(message="Invalid email or password."), 401

    token = issue_token(user)
    logger.info("Login: %s", email)
    return jsonify(token=token, user=user_public(user))


@auth_bp.get("/me")
@login_required
def me():
    from flask import g
    user = User.query.get(g.user_id)
    if not user:
        return jsonify(message="User not found."), 404
    return jsonify(user=user_public(user))


@auth_bp.patch("/me")
@login_required
def update_me():
    """Update the signed-in user's display name."""
    from flask import g
    user = User.query.get(g.user_id)
    if not user:
        return jsonify(message="User not found."), 404
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(message="Name can't be empty."), 400
    if len(name) > 120:
        return jsonify(message="Name is too long."), 400
    user.name = name
    db.session.commit()
    return jsonify(user=user_public(user))


@auth_bp.post("/change-password")
@login_required
@limiter.limit("10 per hour")
def change_password():
    """Change password. Accounts created via Google (no password yet) can set
    one without a current password."""
    from flask import g
    user = User.query.get(g.user_id)
    if not user:
        return jsonify(message="User not found."), 404
    data = request.get_json(force=True)
    current = data.get("current_password") or ""
    new = data.get("new_password") or ""

    if user.password_hash and not verify_password(current, user.password_hash):
        return jsonify(message="Current password is incorrect."), 400
    if len(new) < 8:
        return jsonify(message="New password must be at least 8 characters."), 400

    user.password_hash = hash_password(new)
    db.session.commit()
    logger.info("Password changed for %s", user.email)
    return jsonify(message="Password updated.")


@auth_bp.delete("/me")
@login_required
@limiter.limit("5 per hour")
def delete_me():
    """Delete the account and the face-match data tied to it."""
    from flask import g
    from db import SelfieMatch
    user = User.query.get(g.user_id)
    if not user:
        return jsonify(message="User not found."), 404
    if user.role == "photographer":
        from db import Event
        if Event.query.filter_by(owner_id=user.id).first():
            return jsonify(message="Delete or hand over your events before deleting your account."), 409
    data = request.get_json(silent=True) or {}
    if user.password_hash and not verify_password(data.get("password") or "", user.password_hash):
        return jsonify(message="Password is incorrect."), 400
    SelfieMatch.query.filter_by(user_id=user.id).delete()
    db.session.delete(user)
    db.session.commit()
    logger.info("Account deleted: %s", user.email)
    return jsonify(message="Account deleted.")


@auth_bp.post("/forgot-password")
@limiter.limit("5 per hour")
def forgot_password():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()

    # Always respond the same way whether or not the account exists,
    # so the endpoint can't be used to check which emails are registered.
    if user:
        token = secrets.token_urlsafe(32)
        _reset_tokens[token] = {"user_id": user.id, "expires": datetime.utcnow() + timedelta(hours=1)}
        reset_link = f"{Config.FRONTEND_ORIGIN}/reset-password?token={token}"
        try:
            send_password_reset_email(user.email, reset_link)
        except Exception:
            logger.exception("Failed to send password reset email to %s", email)

    return jsonify(message="If an account exists for that email, a reset link has been sent.")


@auth_bp.post("/reset-password")
@limiter.limit("10 per hour")
def reset_password():
    data = request.get_json(force=True)
    token = data.get("token")
    password = data.get("password") or ""

    entry = _reset_tokens.get(token)
    if not entry or entry["expires"] < datetime.utcnow():
        return jsonify(message="This reset link is invalid or has expired."), 400
    if len(password) < 8:
        return jsonify(message="Password must be at least 8 characters."), 400

    user = User.query.get(entry["user_id"])
    user.password_hash = hash_password(password)
    db.session.commit()
    del _reset_tokens[token]
    logger.info("Password reset completed for %s", user.email)

    return jsonify(message="Password updated successfully.")


@auth_bp.get("/google")
def google_login():
    """Redirect the browser into Google's OAuth consent screen.

    Pass ?role=participant|photographer from the register page so a brand
    new Google sign-up gets the right role; omit it from the login page for
    an existing-user sign-in (role is ignored if the account already exists).
    """
    role = request.args.get("role", "participant")
    if role not in ("participant", "photographer"):
        role = "participant"

    params = (
        "response_type=code"
        f"&client_id={Config.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={Config.GOOGLE_REDIRECT_URI}"
        "&scope=openid%20email%20profile"
        f"&state={role}"
    )
    return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@auth_bp.get("/google/callback")
def google_callback():
    """Exchanges the OAuth code for a Google profile, finds-or-creates the
    matching User, and redirects back to the frontend with a session token.

    Needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI set
    in .env — get these from https://console.cloud.google.com/apis/credentials
    (OAuth client type: Web application, with GOOGLE_REDIRECT_URI added as
    an authorized redirect URI).
    """
    code = request.args.get("code")
    role = request.args.get("state", "participant")
    if not code:
        return jsonify(message="Missing authorization code from Google."), 400
    if not Config.GOOGLE_CLIENT_ID or not Config.GOOGLE_CLIENT_SECRET:
        return jsonify(message="Google OAuth is not configured on this server."), 501

    token_res = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": Config.GOOGLE_CLIENT_ID,
            "client_secret": Config.GOOGLE_CLIENT_SECRET,
            "redirect_uri": Config.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if not token_res.ok:
        logger.error("Google token exchange failed: %s", token_res.text)
        return jsonify(message="Could not verify Google sign-in."), 502

    access_token = token_res.json().get("access_token")

    profile_res = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if not profile_res.ok:
        return jsonify(message="Could not fetch your Google profile."), 502

    profile = profile_res.json()
    google_id = profile.get("sub")
    email = (profile.get("email") or "").lower()
    name = profile.get("name") or email.split("@")[0]

    user = User.query.filter_by(google_id=google_id).first() or User.query.filter_by(email=email).first()
    if not user:
        user = User(name=name, email=email, google_id=google_id, role=role, password_hash=None)
        db.session.add(user)
        db.session.commit()
        logger.info("New %s account via Google: %s", role, email)
    elif not user.google_id:
        user.google_id = google_id
        db.session.commit()

    token = issue_token(user)
    redirect_url = (
        f"{Config.FRONTEND_ORIGIN}/oauth-callback"
        f"?token={token}&id={user.id}&name={requests.utils.quote(user.name)}&role={user.role}"
    )
    return redirect(redirect_url)
