from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from server.models import db, User, Track, RecentlyPlayed
from server.utils import optional_get_identity
from datetime import datetime

interactions_bp = Blueprint('interactions', __name__)

@interactions_bp.route('/likes', methods=['GET'])
def get_likes():
    current_user_id = optional_get_identity()
    if not current_user_id: return jsonify([]), 200
    user = User.query.get(current_user_id)
    return jsonify([{
        'id': t.video_id,
        'title': t.title,
        'artist': t.artist,
        'cover': t.cover_url,
        'stream_url': f"http://127.0.0.1:5000/api/stream/{t.video_id}"
    } for t in user.liked_tracks]), 200

@interactions_bp.route('/likes', methods=['POST'])
def toggle_like():
    current_user_id = optional_get_identity()
    if not current_user_id: return jsonify({'error': 'Login required'}), 401

    user = User.query.get(current_user_id)
    data = request.get_json(force=True, silent=True)
    if not data: return jsonify({'error': 'Invalid JSON'}), 400

    track = Track.query.filter_by(video_id=data.get('id')).first()
    if not track:
        track = Track(
            video_id=data.get('id'),
            title=data.get('title'),
            artist=data.get('artist'),
            cover_url=data.get('cover', ''),
            duration=data.get('duration', '0:00')
        )
        db.session.add(track)
        db.session.flush()

    if track in user.liked_tracks:
        user.liked_tracks.remove(track)
        action = 'removed'
        liked = False
    else:
        user.liked_tracks.append(track)
        action = 'added'
        liked = True

    db.session.commit()
    return jsonify({'message': f'Track {action}', 'liked': liked}), 200

@interactions_bp.route('/history/update', methods=['POST'])
def update_history():
    current_user_id = optional_get_identity()
    if not current_user_id: return jsonify({'status': 'ignored'}), 200

    data = request.get_json(force=True, silent=True) or {}
    if not data.get('id'): return jsonify({'error': 'Invalid data'}), 400

    track = Track.query.filter_by(video_id=data['id']).first()
    if not track:
        track = Track(
            video_id=data['id'], 
            title=data.get('title',''), 
            artist=data.get('artist',''), 
            cover_url=data.get('cover',''), 
            duration=data.get('duration','0:00')
        )
        db.session.add(track)
        db.session.commit()

    # Self-healing duplicates
    entries = RecentlyPlayed.query.filter_by(user_id=current_user_id, track_id=track.id).all()
    if entries:
        entry = entries[0]
        entry.timestamp = data.get('timestamp', 0)
        entry.last_played = datetime.utcnow()
        for dup in entries[1:]:
            db.session.delete(dup)
    else:
        db.session.add(RecentlyPlayed(user_id=current_user_id, track_id=track.id, timestamp=data.get('timestamp', 0)))

    db.session.commit()
    return jsonify({'status': 'ok'})

@interactions_bp.route('/history', methods=['GET'])
@cross_origin()
def get_history():
    current_user_id = optional_get_identity()
    if not current_user_id: return jsonify([]), 200
    
    history = RecentlyPlayed.query.filter_by(user_id=current_user_id).order_by(RecentlyPlayed.last_played.desc()).limit(50).all()
    valid_history = []
    for h in history:
        if h.track:
            valid_history.append({
                'id': h.track.video_id,
                'title': h.track.title,
                'artist': h.track.artist,
                'cover': h.track.cover_url,
                'duration': h.track.duration,
                'stream_url': f"http://127.0.0.1:5000/api/stream/{h.track.video_id}",
                'resume_time': h.timestamp
            })
    return jsonify(valid_history), 200

@interactions_bp.route('/history/<video_id>', methods=['GET'])
def get_history_item(video_id):
    current_user_id = optional_get_identity()
    if not current_user_id: return jsonify({'timestamp': 0}), 200
    
    track = Track.query.filter_by(video_id=video_id).first()
    if not track: return jsonify({'timestamp': 0}), 200
    
    entry = RecentlyPlayed.query.filter_by(user_id=current_user_id, track_id=track.id).first()
    return jsonify({'timestamp': entry.timestamp if entry else 0}), 200

@interactions_bp.route('/history/<string:video_id>', methods=['DELETE'])
def delete_history_item(video_id):
    current_user_id = optional_get_identity()
    if not current_user_id: return jsonify({'error': 'Login required'}), 401

    track = Track.query.filter_by(video_id=video_id).first()
    if not track: return jsonify({'error': 'Track not found'}), 404

    entries = RecentlyPlayed.query.filter_by(user_id=current_user_id, track_id=track.id).all()
    if not entries: return jsonify({'error': 'History entry not found'}), 404
        
    for entry in entries:
        db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'History item removed'}), 200
