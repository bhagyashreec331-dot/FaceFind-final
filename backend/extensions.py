"""Shared Flask extension instances, kept separate from app.py to avoid
circular imports (routes need to import `limiter` without importing the app
factory itself)."""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import Config

limiter = Limiter(key_func=get_remote_address, storage_uri=Config.RATELIMIT_STORAGE_URI)
