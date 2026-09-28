"""
JWT verification + auth decorators.

This is what closes the real security gap in the earlier version: routes
used to trust a `user_id`/`owner_id` field sent straight from the browser,
which meant anyone could claim to be any user just by editing the request.
Now every protected route reads the identity out of a verified JWT instead.
"""

from functools import wraps

import jwt
from flask import g, jsonify, request

from config import Config


def get_bearer_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:]
    return None


def decode_token(token):
    return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])


def login_required(fn):
    """Verifies the JWT and makes the caller available as g.user_id / g.user_role."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify(message="Authentication required."), 401
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify(message="Your session has expired. Please sign in again."), 401
        except jwt.InvalidTokenError:
            return jsonify(message="Invalid authentication token."), 401

        g.user_id = payload["sub"]
        g.user_role = payload["role"]
        return fn(*args, **kwargs)

    return wrapper


def role_required(role):
    """Stack under @login_required: @role_required('photographer')."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if getattr(g, "user_role", None) != role:
                return jsonify(message=f"This action requires a {role} account."), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
