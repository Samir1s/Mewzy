import os
import uuid
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from server.models import db, User, Track
from server.utils import optional_get_identity
from server.config import Config

admin_bp = Blueprint('admin', __name__)
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a'}

# Upload moved to content.py to allow user uploads

@admin_bp.route('/admin/tracks', methods=['GET'])
@jwt_required()
def admin_get_tracks():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user.is_admin: return jsonify({'error': 'Admin access required'}), 403
    
    tracks = Track.query.all()
    return jsonify([{
        'id': t.id,
        'video_id': t.video_id,
        'title': t.title,
        'artist': t.artist,
        'genre': t.genre,
        'category': t.category
    } for t in tracks])

@admin_bp.route('/admin/tracks/<int:track_id>', methods=['PUT'])
@jwt_required()
def admin_update_track(track_id):
    user = User.query.get(get_jwt_identity())
    if not user.is_admin: return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    track = Track.query.get_or_404(track_id)
    
    track.title = data.get('title', track.title)
    track.artist = data.get('artist', track.artist)
    track.genre = data.get('genre', track.genre)
    track.category = data.get('category', track.category)
    track.description = data.get('description', track.description)
    
    db.session.commit()
    return jsonify({'message': 'Track updated successfully'})
