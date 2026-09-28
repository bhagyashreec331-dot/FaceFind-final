"""
Photo storage helpers.

Two backends:

- "local" (default): saves files under backend/uploads/ and serves them back
  through the Flask app's /media/<path> route.

- "r2": Cloudflare R2 (S3-compatible), used in production. Set
  STORAGE_BACKEND=r2 and fill in the R2_* values in .env to switch to it.
"""

import os
import shutil
import uuid

from config import Config


ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE_MB = 15


def is_valid_image(filename, file_size_bytes):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file type: .{ext}"

    if file_size_bytes > MAX_FILE_SIZE_MB * 1024 * 1024:
        return False, f"File exceeds the {MAX_FILE_SIZE_MB}MB limit"

    return True, None


def build_storage_key(event_id, filename, prefix="photos"):
    ext = filename.rsplit(".", 1)[-1].lower()

    return f"{prefix}/{event_id}/{uuid.uuid4()}.{ext}"


def _local_path(storage_key):
    basedir = os.path.abspath(
        os.path.dirname(os.path.dirname(__file__))
    )

    path = os.path.join(
        basedir,
        Config.LOCAL_STORAGE_DIR,
        storage_key,
    )

    os.makedirs(
        os.path.dirname(path),
        exist_ok=True,
    )

    return path


def upload_file(
    local_path,
    storage_key,
    content_type="image/jpeg",
):
    if Config.STORAGE_BACKEND == "r2":
        return _r2_upload_file(
            local_path,
            storage_key,
            content_type,
        )

    dest = _local_path(storage_key)

    shutil.copyfile(
        local_path,
        dest,
    )

    return storage_key


# ============================================================
# GET PHOTO URL
# ============================================================

def get_signed_url(storage_key, expires_in=3600):
    """
    Return a URL that the frontend can use to display/download
    the stored photo.
    """

    if Config.STORAGE_BACKEND == "r2":
        return _r2_get_signed_url(
            storage_key,
            expires_in,
        )

    return f"{Config.PUBLIC_BASE_URL}/media/{storage_key}"


# ============================================================
# DELETE PHOTO FROM STORAGE
# ============================================================

def delete_file(storage_key):
    """
    Delete a stored photo or thumbnail.

    Works with both:
    - local storage
    - Cloudflare R2
    """

    if not storage_key:
        return

    if Config.STORAGE_BACKEND == "r2":
        return _r2_delete_file(storage_key)

    path = _local_path(storage_key)

    if os.path.exists(path):
        os.remove(path)


# ============================================================
# CLOUDFLARE R2
# ============================================================

def _r2_client():
    import boto3
    from botocore.client import Config as BotoConfig

    return boto3.client(
        "s3",
        endpoint_url=Config.R2_ENDPOINT_URL,
        aws_access_key_id=Config.R2_ACCESS_KEY_ID,
        aws_secret_access_key=Config.R2_SECRET_ACCESS_KEY,
        config=BotoConfig(
            signature_version="s3v4"
        ),
        region_name="auto",
    )


def _r2_upload_file(
    local_path,
    storage_key,
    content_type,
):
    client = _r2_client()

    client.upload_file(
        local_path,
        Config.R2_BUCKET_NAME,
        storage_key,
        ExtraArgs={
            "ContentType": content_type
        },
    )

    return storage_key


def _r2_get_signed_url(
    storage_key,
    expires_in,
):
    client = _r2_client()

    return client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": Config.R2_BUCKET_NAME,
            "Key": storage_key,
        },
        ExpiresIn=expires_in,
    )


def _r2_delete_file(storage_key):
    client = _r2_client()

    client.delete_object(
        Bucket=Config.R2_BUCKET_NAME,
        Key=storage_key,
    )