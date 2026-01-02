from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from server.models import db, Playlist, Track
from server.utils import optional_get_identity
from ytmusicapi import YTMusic

playlists_bp = Blueprint('playlists', __name__)
yt = YTMusic()

@playlists_bp.route('', methods=['GET'], strict_slashes=False)
def get_playlists():
    current_user_id = optional_get_identity()
    if not current_user_id:
        return jsonify([]), 200
    playlists = Playlist.query.filter_by(user_id=current_user_id).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'count': len(p.tracks)
    } for p in playlists]), 200

@playlists_bp.route('', methods=['POST'], strict_slashes=False)
def create_playlist():
    current_user_id = optional_get_identity()
    
    data = request.get_json(force=True, silent=True) or {}
    if not data.get('name'):
        return jsonify({'error': 'Playlist name required'}), 400

    new_playlist = Playlist(name=data['name'], user_id=current_user_id)
    db.session.add(new_playlist)
    db.session.commit()
    return jsonify({'message': 'Playlist created', 'id': new_playlist.id, 'name': new_playlist.name}), 201

@playlists_bp.route('/<int:playlist_id>', methods=['GET'])
def get_playlist(playlist_id):
    playlist = Playlist.query.filter_by(id=playlist_id).first()
    if not playlist:
        return jsonify({'error': 'Playlist not found'}), 404

    tracks = []
    for t in playlist.tracks:
        tracks.append({
            'id': t.video_id,
            'title': t.title,
            'artist': t.artist,
            'cover': t.cover_url,
            'duration': t.duration,
            'stream_url': f"http://127.0.0.1:5000/api/stream/{t.video_id}"
        })

    return jsonify({'id': playlist.id, 'name': playlist.name, 'tracks': tracks}), 200

@playlists_bp.route('/<int:playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    current_user_id = optional_get_identity()
    playlist = Playlist.query.filter_by(id=playlist_id).first()
    
    if not playlist: return jsonify({'error': 'Playlist not found'}), 404
    if playlist.user_id != current_user_id: return jsonify({'error': 'Unauthorized'}), 403

    db.session.delete(playlist)
    db.session.commit()
    return jsonify({'message': 'Playlist deleted'}), 200

@playlists_bp.route('/<int:playlist_id>/tracks', methods=['POST'])
def add_to_playlist(playlist_id):
    current_user_id = optional_get_identity()
    data = request.get_json(force=True, silent=True)
    if not data: return jsonify({'error': 'Invalid JSON'}), 400

    playlist = Playlist.query.filter_by(id=playlist_id).first()
    if not playlist: return jsonify({'error': 'Playlist not found'}), 404
    if playlist.user_id is not None and playlist.user_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403

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

    if track not in playlist.tracks:
        playlist.tracks.append(track)
        db.session.commit()

    return jsonify({'message': 'Added'}), 200

@playlists_bp.route('/<int:playlist_id>/tracks/<string:video_id>', methods=['DELETE'])
def remove_from_playlist(playlist_id, video_id):
    current_user_id = optional_get_identity()
    playlist = Playlist.query.filter_by(id=playlist_id).first()
    
    if not playlist: return jsonify({'error': 'Playlist not found'}), 404
    if playlist.user_id != current_user_id: return jsonify({'error': 'Unauthorized'}), 403

    track = Track.query.filter_by(video_id=video_id).first()
    if track and track in playlist.tracks:
        playlist.tracks.remove(track)
        db.session.commit()
        return jsonify({'message': 'Track removed'}), 200
    
    return jsonify({'error': 'Track not in playlist'}), 404

@playlists_bp.route('/import-youtube', methods=['POST'])
@jwt_required()
def import_youtube_playlist():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    yt_id = data.get('yt_playlist_id')
    name = data.get('name', 'Imported Playlist')

    if not yt_id: return jsonify({'error': 'Missing yt_playlist_id'}), 400

    try:
        try:
            yt_data = yt.get_playlist(playlistId=yt_id)
        except Exception:
            try:
                yt_data = yt.get_album(browseId=yt_id)
            except Exception:
                return jsonify({'error': 'Could not fetch from YouTube. Invalid ID.'}), 400

        new_playlist = Playlist(name=name, user_id=current_user_id)
        db.session.add(new_playlist)
        db.session.flush()

        count = 0
        tracks_list = yt_data.get('tracks', [])
        
        for t in tracks_list:
            v_id = t.get('videoId')
            if not v_id: continue

            track_title = t.get('title', 'Unknown')
            artists_raw = t.get('artists', [])
            track_artist = artists_raw[0]['name'] if isinstance(artists_raw, list) and len(artists_raw) > 0 else str(artists_raw)
            duration = t.get('duration', t.get('length', '0:00'))
            thumbnails = t.get('thumbnails', [])
            cover_url = thumbnails[-1]['url'] if thumbnails else ''
            
            track = Track.query.filter_by(video_id=v_id).first()
            if not track:
                track = Track(video_id=v_id, title=track_title, artist=track_artist, cover_url=cover_url, duration=duration)
                db.session.add(track)
                db.session.flush()
            
            if track not in new_playlist.tracks:
                new_playlist.tracks.append(track)
                count += 1
        
        db.session.commit()
        return jsonify({'message': 'Imported', 'count': count, 'id': new_playlist.id}), 200

    except Exception as e:
        print(f"Import Error: {e}")
        return jsonify({'error': str(e)}), 500
