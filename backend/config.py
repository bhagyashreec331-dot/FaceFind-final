import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


class Config:

    """Central app configuration, populated from environment variables.

    Nothing here is a real secret or credential — fill in the .env file
    (copy .env.example to .env) with your own values before running.
    """

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt-secret")

    JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "24"))

    # Database engine: "sqlite" (default, zero setup — a local .db file) or
    # "mysql" (set DB_ENGINE=mysql and fill in the DB_* values below for
    # production). SQLite needs nothing installed or configured to work.

    DB_ENGINE = os.getenv("DB_ENGINE", "sqlite")

    DB_HOST = os.getenv("DB_HOST", "localhost")

    DB_PORT = os.getenv("DB_PORT", "3306")

    DB_NAME = os.getenv("DB_NAME", "facefind")

    DB_USER = os.getenv("DB_USER", "root")

    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    if DB_ENGINE == "mysql":
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{DB_USER}:{quote_plus(DB_PASSWORD)}"
            f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
    else:
        _basedir = os.path.abspath(os.path.dirname(__file__))
        SQLALCHEMY_DATABASE_URI = (
            f"sqlite:///{os.path.join(_basedir, 'facefind.db')}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Storage backend
    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")

    LOCAL_STORAGE_DIR = os.getenv("LOCAL_STORAGE_DIR", "uploads")

    PUBLIC_BASE_URL = os.getenv(
        "PUBLIC_BASE_URL",
        "http://localhost:5000"
    )

    # Cloudflare R2
    R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")

    R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")

    R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")

    R2_BUCKET_NAME = os.getenv(
        "R2_BUCKET_NAME",
        "facefind-photos"
    )

    R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL", "")

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")

    # Face matching (InsightFace / ArcFace)
    FACE_SIMILARITY_THRESHOLD = float(
        os.getenv("FACE_SIMILARITY_THRESHOLD", "0.40")
    )

    FACE_MODEL = os.getenv("FACE_MODEL", "buffalo_l")

    FACE_DET_SIZE = int(
        os.getenv("FACE_DET_SIZE", "640")
    )

    # Email
    SMTP_HOST = os.getenv("SMTP_HOST", "")

    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

    SMTP_USER = os.getenv("SMTP_USER", "")

    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

    SMTP_FROM = os.getenv("SMTP_FROM", "")

    # Rate limiting
    RATELIMIT_STORAGE_URI = os.getenv(
        "RATELIMIT_STORAGE_URI",
        "memory://"
    )

    # CORS
    FRONTEND_ORIGIN = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:5173"
    )