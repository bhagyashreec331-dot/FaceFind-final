"""
Image optimization: generates a compressed thumbnail alongside the original
upload, so gallery grids load fast even with large source photos. The
original is kept untouched for downloads.
"""

import os
import tempfile

from PIL import Image, ImageOps

THUMB_MAX_DIMENSION = 480
THUMB_QUALITY = 80


def create_thumbnail(source_path):
    """Returns a path to a temp JPEG thumbnail. Caller is responsible for
    deleting it once uploaded."""
    with Image.open(source_path) as img:
        img = ImageOps.exif_transpose(img)  # respect camera orientation
        img = img.convert("RGB")
        img.thumbnail((THUMB_MAX_DIMENSION, THUMB_MAX_DIMENSION))

        fd, thumb_path = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)
        img.save(thumb_path, "JPEG", quality=THUMB_QUALITY, optimize=True)

    return thumb_path
