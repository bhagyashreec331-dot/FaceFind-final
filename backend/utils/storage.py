"""
Photo storage helpers.

Supported storage backends:
- local
- r2
- supabase
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


# ============================================================
# LOCAL STORAGE
# ============================================================

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


# ============================================================
# SUPABASE
# ============================================================

def _supabase_client():
    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url:
        raise RuntimeError("SUPABASE_URL is not configured")

    if not key:
        raise RuntimeError("SUPABASE_SERVICE_KEY is not configured")

    return create_client(url, key)


def _supabase_bucket():
    return os.getenv(
        "SUPABASE_STORAGE_BUCKET",
        "facefind",
    )


def _supabase_upload_file(
    local_path,
    storage_key,
    content_type,
):
    client = _supabase_client()
    bucket = _supabase_bucket()

    with open(local_path, "rb") as file:
        client.storage.from_(bucket).upload(
            path=storage_key,
            file=file,
            file_options={
                "content-type": content_type,
                "upsert": "false",
            },
        )

    return storage_key


def _supabase_get_signed_url(
    storage_key,
    expires_in,
):
    client = _supabase_client()
    bucket = _supabase_bucket()

    response = (
        client.storage
        .from_(bucket)
        .create_signed_url(
            storage_key,
            expires_in,
        )
    )

    # Handle different supabase-py response formats
    data = getattr(response, "data", response)

    if isinstance(data, dict):
        signed_url = (
            data.get("signedURL")
            or data.get("signedUrl")
            or data.get("signed_url")
        )
    else:
        signed_url = (
            getattr(data, "signedURL", None)
            or getattr(data, "signedUrl", None)
            or getattr(data, "signed_url", None)
        )

    if not signed_url:
        raise RuntimeError(
            f"Could not create signed URL for: {storage_key}"
        )

    return signed_url


def _supabase_delete_file(storage_key):
    client = _supabase_client()
    bucket = _supabase_bucket()

    return (
        client.storage
        .from_(bucket)
        .remove([storage_key])
    )


# ============================================================
# R2
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


# ============================================================
# UPLOAD FILE
# ============================================================

def upload_file(
    local_path,
    storage_key,
    content_type="image/jpeg",
):
    if Config.STORAGE_BACKEND == "supabase":
        return _supabase_upload_file(
            local_path,
            storage_key,
            content_type,
        )

    if Config.STORAGE_BACKEND == "r2":
        return _r2_upload_file(
            local_path,
            storage_key,
            content_type,
        )

    # Local storage
    dest = _local_path(storage_key)

    shutil.copyfile(
        local_path,
        dest,
    )

    return storage_key


# ============================================================
# GET PHOTO URL
# ============================================================

def get_signed_url(
    storage_key,
    expires_in=3600,
):
    """
    Return a URL that the frontend can use
    to display/download the stored photo.
    """

    if Config.STORAGE_BACKEND == "supabase":
        return _supabase_get_signed_url(
            storage_key,
            expires_in,
        )

    if Config.STORAGE_BACKEND == "r2":
        return _r2_get_signed_url(
            storage_key,
            expires_in,
        )

    # Local storage
    return f"{Config.PUBLIC_BASE_URL}/media/{storage_key}"


# ============================================================
# DELETE PHOTO FROM STORAGE
# ============================================================

def delete_file(storage_key):
    """
    Delete a stored photo or thumbnail.

    Works with:
    - local storage
    - Cloudflare R2
    - Supabase Storage
    """

    if not storage_key:
        return

    if Config.STORAGE_BACKEND == "supabase":
        return _supabase_delete_file(storage_key)

    if Config.STORAGE_BACKEND == "r2":
        return _r2_delete_file(storage_key)

    # Local storage
    path = _local_path(storage_key)

    if os.path.exists(path):
        os.remove(path)