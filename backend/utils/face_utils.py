"""
Face detection, embedding extraction, and matching helpers.

Uses InsightFace (ArcFace embeddings + RetinaFace detection, run through
ONNX Runtime) instead of the older dlib-based `face_recognition`. It is far
more accurate on group shots, side angles and small faces, which is exactly
what event photos are full of.

How matching works now:
  * every face becomes a 512-d L2-normalised embedding
  * two faces are compared with cosine similarity (higher = more similar,
    1.0 = identical)
  * a face is a match when similarity >= FACE_SIMILARITY_THRESHOLD
    (default 0.40, a good balance for ArcFace buffalo_l models)

It is still an optional dependency: if InsightFace isn't installed, uploads
and selfies are accepted and stored but no matching happens, and a warning is
printed once at startup so it's obvious why.

    pip install -r requirements.txt -r requirements-full.txt

The first run downloads the model pack (~280 MB for buffalo_l) to
~/.insightface/models. Use FACE_MODEL=buffalo_s for a smaller, faster pack.
"""

import logging
import threading

import numpy as np
from PIL import Image, ImageOps

from config import Config

logger = logging.getLogger("facefind.faces")

try:
    from insightface.app import FaceAnalysis
    FACE_ENGINE_AVAILABLE = True
except ImportError:  # InsightFace / onnxruntime / opencv not installed
    FaceAnalysis = None
    FACE_ENGINE_AVAILABLE = False
    print(
        "\n[FaceFind] 'insightface' is not installed — photo uploads and "
        "selfies will be accepted, but no face matching will happen. "
        "Run `pip install -r requirements-full.txt` to enable it.\n"
    )

EMBEDDING_DIM = 512          # ArcFace output size
MIN_DETECTION_SCORE = 0.5    # ignore very uncertain "faces" (posters, patterns)
MAX_IMAGE_SIDE = 2400        # downscale huge originals; faces stay well resolved

_model = None
_model_lock = threading.Lock()


def _get_model():
    """Load the model once, on first use (thread-safe — uploads run in a pool)."""
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            det = Config.FACE_DET_SIZE
            logger.info("Loading InsightFace model '%s' (det_size=%d)…", Config.FACE_MODEL, det)
            app = FaceAnalysis(name=Config.FACE_MODEL, providers=["CPUExecutionProvider"])
            app.prepare(ctx_id=-1, det_size=(det, det))
            _model = app
            logger.info("InsightFace model ready.")
    return _model


def warm_up():
    """Optional: load the model in the background at server start so the
    first upload doesn't pay the load cost."""
    if not FACE_ENGINE_AVAILABLE:
        return
    try:
        _get_model()
    except Exception:
        logger.exception("Could not load the InsightFace model")


def _load_bgr(image_path):
    """Read an image, honour camera orientation, return a BGR uint8 array
    (the format InsightFace/OpenCV expect)."""
    with Image.open(image_path) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        if max(img.size) > MAX_IMAGE_SIDE:
            img.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
        rgb = np.asarray(img)
    return np.ascontiguousarray(rgb[:, :, ::-1])


def _detect(image_path):
    """All confidently-detected faces in an image (InsightFace Face objects)."""
    faces = _get_model().get(_load_bgr(image_path))
    return [f for f in faces if float(f.det_score) >= MIN_DETECTION_SCORE]


def _box_area(face):
    x1, y1, x2, y2 = face.bbox
    return max(0.0, x2 - x1) * max(0.0, y2 - y1)


def detect_faces(image_path):
    """Return a list of face bounding boxes [x1, y1, x2, y2] found in an image."""
    if not FACE_ENGINE_AVAILABLE:
        return []
    return [[float(v) for v in f.bbox] for f in _detect(image_path)]


def extract_embeddings(image_path):
    """Return a list of 512-d normalised embeddings, one per face in the image.

    Every face in a group photo gets its own embedding, so one event photo can
    match several different participants.
    """
    if not FACE_ENGINE_AVAILABLE:
        return []
    return [f.normed_embedding.astype(float).tolist() for f in _detect(image_path)]


def extract_selfie_embedding(image_path):
    """Return one embedding for a selfie, or None if no face was found.

    If several faces are detected the largest (closest) one is used, since
    that's most likely the person taking the selfie.
    """
    if not FACE_ENGINE_AVAILABLE:
        return None
    faces = _detect(image_path)
    if not faces:
        return None
    largest = max(faces, key=_box_area)
    return largest.normed_embedding.astype(float).tolist()


def compare_embeddings(selfie_embedding, candidate_embedding, threshold=None):
    """Return (is_match, similarity) for a selfie vs. one candidate face.

    Similarity is cosine similarity in [-1, 1]; higher is more alike. It is
    stored as the match score (clamped to 0-1) so the gallery can sort by it.
    Embeddings of a different size (e.g. the 128-d ones saved by the old
    dlib version) can't be compared and are treated as non-matches — those
    photos need re-uploading to be searchable again.
    """
    if threshold is None:
        threshold = Config.FACE_SIMILARITY_THRESHOLD
    a = np.asarray(selfie_embedding, dtype=float)
    b = np.asarray(candidate_embedding, dtype=float)
    if a.shape != b.shape or a.shape != (EMBEDDING_DIM,):
        return False, 0.0

    # Re-normalise defensively so the dot product is a true cosine.
    a = a / (np.linalg.norm(a) or 1.0)
    b = b / (np.linalg.norm(b) or 1.0)
    similarity = float(np.dot(a, b))
    return similarity >= threshold, round(max(0.0, similarity), 4)


def find_matches_for_selfie(selfie_embedding, photo_embeddings, threshold=None):
    """Given a selfie embedding and {photo_id: [embeddings]}, return matches.

    Returns [{photo_id, similarity_score}] for every photo containing at least
    one face similar enough to the selfie, best matches first.
    """
    matches = []
    for photo_id, embeddings in photo_embeddings.items():
        best_score = 0.0
        matched = False
        for embedding in embeddings:
            is_match, score = compare_embeddings(selfie_embedding, embedding, threshold)
            if is_match and score > best_score:
                matched = True
                best_score = score
        if matched:
            matches.append({"photo_id": photo_id, "similarity_score": best_score})
    return sorted(matches, key=lambda m: m["similarity_score"], reverse=True)
