import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from server.config import Config
from server.models import db
from server.extensions import limiter, jwt
from server.routes.auth import auth_bp
from server.routes.player import player_bp
from server.routes.playlists import playlists_bp
from server.routes.content import content_bp
from server.routes.interactions import interactions_bp

from server.routes.admin import admin_bp
from server.routes.social import social_bp




app = Flask(__name__)
app.config.from_object(Config)

# Initialize Extensions
# TODO: In production, strict origin restriction is required.
allowed_origins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "https://mewzy.vercel.app"]
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    allowed_origins.append(frontend_url)

print(f"DEBUG: Allowed Origins: {allowed_origins}") # Print to Render logs

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
db.init_app(app)
jwt.init_app(app)
limiter.init_app(app)

# Security Headers
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    # Strict-Transport-Security (HSTS) - 1 year. Only applied if HTTPS is used.
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    # Content Security Policy (Basic)
    # Note: Connect-src needs to allow self and potentially other APIs if used
    # Content-Security-Policy (Disabled for debugging global CORS issues)
    # response.headers['Content-Security-Policy'] = "default-src 'self' http: https: data: blob: 'unsafe-inline'"
    return response

# JWT Error Handlers
@jwt.unauthorized_loader
def unauthorized_response(callback):
    return jsonify({'error': 'Authorization header missing or invalid'}), 401

@jwt.invalid_token_loader
def invalid_token_response(callback):
    return jsonify({'error': 'Invalid token'}), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token expired'}), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token revoked'}), 401

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(player_bp, url_prefix='/api')
app.register_blueprint(playlists_bp, url_prefix='/api/playlists')
app.register_blueprint(content_bp, url_prefix='/api')
app.register_blueprint(interactions_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(social_bp, url_prefix='/api')

# Note: admin_bp routes were defined as /upload (becomes /api/admin/upload if we prefix, but upload was /api/upload)
# and /tracks (becomes /api/admin/tracks).
# The original app had /api/upload.
# Let's adjust the prefixing or the blueprint routes.
# In admin.py, I defined /upload. If I mount at /api/admin, it becomes /api/admin/upload.
# The original app used /api/upload.
# I should re-register admin_bp strictly for the admin specific routes or split them?
# Actually, /api/upload is somewhat general but restricted to admin.
# Let's just mount admin_bp at /api/admin and update the route in admin.py?
# OR: mount it at /api and keep routes as they are in blueprint?
# In admin.py:
# @admin_bp.route('/upload') -> /api/upload (if mounted at /api)
# @admin_bp.route('/tracks') -> /api/tracks (Wait, we want /api/admin/tracks)
# So if I mount at /api, I need to define '/admin/tracks' in the blueprint.
# Let's look at admin.py content again (I just wrote it).
# I wrote: @admin_bp.route('/upload') and @admin_bp.route('/tracks').
# If I mount at /api/admin, then /api/admin/upload and /api/admin/tracks.
# This changes the API for upload!
# OPTION: Mount at /api and change blueprint routes.
# I will overwrite app.py to correct this logic.

# Initialize DB (Auto-create)
with app.app_context():
    db.create_all()
    # Migration helper for profile_pic + bio + banner
    # We use separate connections/transactions for each to avoid "current transaction is aborted" errors
    try:
        with db.engine.begin() as conn:
            conn.execute(db.text('ALTER TABLE "user" ADD COLUMN profile_pic VARCHAR(500) DEFAULT \'https://cdn-icons-png.flaticon.com/512/847/847969.png\''))
            print("Added profile_pic column")
    except Exception as e: 
        print(f"Skipping profile_pic (exists or error): {e}")

    try:
        with db.engine.begin() as conn:
            conn.execute(db.text('ALTER TABLE "user" ADD COLUMN bio TEXT'))
            print("Added bio column")
    except Exception as e: 
        print(f"Skipping bio (exists or error): {e}")

    try:
        with db.engine.begin() as conn:
            conn.execute(db.text('ALTER TABLE "user" ADD COLUMN banner_url VARCHAR(500)'))
            print("Added banner_url column")
    except Exception as e: 
        print(f"Skipping banner_url (exists or error): {e}")

if __name__ == '__main__':
    app.run(debug=True, port=5000)