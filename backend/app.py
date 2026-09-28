import logging
import os
import threading

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import Config
from db import init_db
from extensions import limiter
from routes.auth import auth_bp
from routes.events import events_bp
from routes.photos import photos_bp
from routes.gallery import gallery_bp
from utils import face_utils


def create_app():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, supports_credentials=True, origins=[Config.FRONTEND_ORIGIN])
    limiter.init_app(app)

    init_db(app)

    # Load the face model in the background so the first upload isn't slow.
    threading.Thread(target=face_utils.warm_up, daemon=True).start()

    app.register_blueprint(auth_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(photos_bp)
    app.register_blueprint(gallery_bp)

    @app.get("/")
    def index():
        return jsonify(status="ok", service="FaceFind API")

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.get("/media/<path:filename>")
    def media(filename):
        """Serves locally-stored photos when STORAGE_BACKEND=local (the default)."""
        basedir = os.path.abspath(os.path.dirname(__file__))
        upload_dir = os.path.join(basedir, Config.LOCAL_STORAGE_DIR)
        return send_from_directory(upload_dir, filename)

    # ---- Consistent JSON error responses ----
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify(message="Not found."), 404

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify(message="Too many requests. Please slow down and try again shortly."), 429

    @app.errorhandler(500)
    def server_error(e):
        app.logger.exception("Unhandled server error: %s", e)
        return jsonify(message="Something went wrong on our end. Please try again."), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
