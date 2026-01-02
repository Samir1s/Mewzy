from flask import Blueprint, jsonify, request
from server.models import db, User, Track, RecentlyPlayed
from server.utils import optional_get_identity
from server.config import Config
from ytmusicapi import YTMusic
import random
import os
import uuid

content_bp = Blueprint('content', __name__)
yt = YTMusic()
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@content_bp.route('/upload', methods=['POST'])
def upload_file():
    current_user_id = optional_get_identity()
    if not current_user_id: return jsonify({'error': 'Unauthorized'}), 403

    if 'file' not in request.files: return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        vid = str(uuid.uuid4())
        filename = f"{vid}.{ext}"
        save_path = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(save_path)

        # metadata
        title = request.form.get('title', filename)
        artist = request.form.get('artist', 'Unknown Artist')
        cover = request.form.get('cover', '')

        track = Track(video_id=vid, title=title, artist=artist, cover_url=cover, duration=request.form.get('duration','0:00'))
        db.session.add(track)
        db.session.commit()
        return jsonify({'message': 'Uploaded', 'id': vid, 'url': f"/api/stream/{vid}"}), 201
        
    return jsonify({'error': 'Invalid file type'}), 400

@content_bp.route('/search', methods=['GET'])
def search():
    query = request.args.get('q')
    search_type = request.args.get('type', 'songs')
    if not query: return jsonify([])
    try:
        yt_filter = 'songs'
        if search_type == 'podcasts': yt_filter = 'playlists'
        elif search_type == 'episodes': yt_filter = 'episodes'
        elif search_type == 'playlists': yt_filter = 'playlists'

        results = yt.search(query, filter=yt_filter, limit=20)
        formatted = []
        for r in results:
            id_key = 'browseId' if search_type in ['podcasts', 'playlists'] else 'videoId'
            if id_key not in r: continue
            
            artist = "Unknown"
            if 'artists' in r and r['artists']: artist = r['artists'][0]['name']
            elif 'author' in r: artist = r['author']

            formatted.append({
                'id': r[id_key],
                'title': r.get('title', 'Unknown'),
                'artist': artist,
                'cover': r['thumbnails'][-1]['url'] if 'thumbnails' in r else '',
                'duration': r.get('duration', '0:00') if search_type == 'songs' else ('Playlist' if search_type == 'playlists' else 'Series'),
                'stream_url': f"http://127.0.0.1:5000/api/stream/{r[id_key]}" if search_type == 'songs' else None,
                'type': search_type,
                'item_count': r.get('itemCount', 'Unknown') if search_type == 'playlists' else None
            })
        return jsonify(formatted)
    except Exception as e:
        print(f"Search Error: {e}")
        return jsonify([])

@content_bp.route('/search/suggestions', methods=['GET'])
def search_suggestions():
    q = request.args.get('q', '')
    if not q: return jsonify([])
    try:
        results = yt.search(q, filter='songs', limit=8)
        suggestions = []
        for r in results:
            title = r.get('title')
            if title and title not in suggestions:
                suggestions.append(title)
            if len(suggestions) >= 8: break
        return jsonify(suggestions)
    except: return jsonify([])

@content_bp.route('/feed', methods=['GET'])
def feed():
    try:
        results = yt.search("Top Global Hits", filter='songs', limit=15)
        formatted = []
        for r in results:
            if 'videoId' not in r: continue
            formatted.append({
                'id': r['videoId'],
                'title': r['title'],
                'artist': r['artists'][0]['name'],
                'cover': r['thumbnails'][-1]['url'],
                'duration': r.get('duration', '0:00'),
                'stream_url': f"http://127.0.0.1:5000/api/stream/{r['videoId']}"
            })
        return jsonify(formatted)
    except: return jsonify([])

@content_bp.route('/podcasts', methods=['GET'])
def get_podcasts():
    try:
        # Use playlists filter for podcasts
        results = yt.search("podcast", filter="playlists", limit=20)
        formatted = []
        for r in results:
            if 'browseId' not in r: continue
            formatted.append({
                'id': r['browseId'],
                'title': r.get('title', 'Unknown'),
                'artist': r.get('author', 'Unknown'),
                'cover': r['thumbnails'][-1]['url'] if 'thumbnails' in r else '',
                'type': 'podcast'
            })
        return jsonify(formatted)
    except: return jsonify([])

@content_bp.route('/podcasts/<string:browse_id>', methods=['GET'])
def get_podcast_episodes(browse_id):
    try:
        data = None
        # Try finding as playlist first (most common for 'podcasts' on YT)
        try: data = yt.get_playlist(browse_id, limit=50)
        except: pass
        
        if not data:
            try: data = yt.get_podcast(browse_id, limit=50)
            except: pass

        if not data:
            return jsonify({'title': 'Error loading podcast', 'episodes': []}), 200

        episodes = []
        tracks = data.get('tracks', []) or data.get('contents', [])

        for t in tracks:
            if 'videoId' not in t: continue
            artist = data.get('title', 'Podcast')
            if 'artists' in t and t['artists']: artist = t['artists'][0]['name']

            episodes.append({
                'id': t['videoId'],
                'title': t.get('title', 'Unknown'),
                'artist': artist,
                'cover': t.get('thumbnails', [{'url': ''}])[-1]['url'] if t.get('thumbnails') else (data.get('thumbnails', [{'url': ''}])[-1]['url']),
                'duration': t.get('duration', '0:00'),
                'stream_url': f"http://127.0.0.1:5000/api/stream/{t['videoId']}"
            })
        return jsonify({
            'title': data.get('title', 'Podcast'),
            'description': data.get('description', ''),
            'cover': data['thumbnails'][-1]['url'] if data.get('thumbnails') else '',
            'episodes': episodes
        })
    except Exception:
        return jsonify({'title': 'Error loading podcast', 'episodes': []}), 200

@content_bp.route('/recommendations', methods=['GET'])
def get_recommendations():
    current_user_id = optional_get_identity()
    if not current_user_id: return feed()

    try:
        user = User.query.get(current_user_id)
        history = RecentlyPlayed.query.filter_by(user_id=current_user_id).order_by(RecentlyPlayed.last_played.desc()).limit(5).all()
        
        seeds = [t.video_id for t in user.liked_tracks[-3:]]
        seeds += [h.track.video_id for h in history[:3] if h.track]
        unique_seeds = list(set(seeds))
        
        if not unique_seeds: return feed()

        seed_id = random.choice(unique_seeds)
        radio = yt.get_watch_playlist(videoId=seed_id, limit=20)
        
        if 'tracks' in radio:
            return jsonify([{
                'id': t['videoId'],
                'title': t['title'],
                'artist': t['artists'][0]['name'] if 'artists' in t else 'Unknown',
                'cover': t.get('thumbnails', t.get('thumbnail', [{'url':''}]))[-1]['url'],
                'duration': '0:00',
                'stream_url': f"http://127.0.0.1:5000/api/stream/{t['videoId']}"
            } for t in radio['tracks'] if 'videoId' in t])
            
        return feed()
    except: return feed()

@content_bp.route('/flow', methods=['GET'])
def get_flow():
    """
    Generates a personalized 'Flow' (infinite mix) for the user.
    If logged in: Based on likes/history.
    If guest: Based on global hits but randomized.
    """
    try:
        current_user_id = optional_get_identity()
        seeds = []
        
        if current_user_id:
            user = User.query.get(current_user_id)
            if user:
                # 1. Get recent history seeds
                history = RecentlyPlayed.query.filter_by(user_id=current_user_id).order_by(RecentlyPlayed.last_played.desc()).limit(10).all()
                seeds += [h.track.video_id for h in history if h.track]
                
                # 2. Get liked songs seeds
                seeds += [t.video_id for t in user.liked_tracks[-10:]]
        
        # 3. Fallback or Guest: Use a popular song as seed if no auth/history
        if not seeds:
            # Fallback seeds (popular songs: Blinding Lights, Starboy, etc)
            seeds = ["4NRXx6U8ABQ", "34Na4j8AVgA", "fHI8X4OXluQ"] 
            
        seed_id = random.choice(seeds)
        
        # Get a Watch Playlist (Radio) based on the seed
        radio = yt.get_watch_playlist(videoId=seed_id, limit=25)
        
        if 'tracks' in radio:
            formatted = [{
                'id': t['videoId'],
                'title': t['title'],
                'artist': t['artists'][0]['name'] if 'artists' in t else 'Unknown',
                'cover': t.get('thumbnails', t.get('thumbnail', [{'url':''}]))[-1]['url'],
                'duration': '0:00',
                'stream_url': f"http://127.0.0.1:5000/api/stream/{t['videoId']}"
            } for t in radio['tracks'] if 'videoId' in t]
            
            # Shuffle slightly for "Freshness" feeling
            random.shuffle(formatted)
            return jsonify(formatted)
            
        return feed()
    except Exception as e:
        print(f"Flow Error: {e}")
        return feed()

@content_bp.route('/radio/<video_id>', methods=['GET'])
def get_radio(video_id):
    try:
        # 1. Get Standard Radio (Based on current song)
        radio_tracks = []
        try:
            radio = yt.get_watch_playlist(videoId=video_id, limit=20)
            if 'tracks' in radio:
                radio_tracks = [{
                    'id': t['videoId'],
                    'title': t['title'],
                    'artist': t['artists'][0]['name'] if 'artists' in t else 'Unknown',
                    'cover': t.get('thumbnails', t.get('thumbnail', [{'url':''}]))[-1]['url'],
                    'duration': '0:00',
                    'stream_url': f"http://127.0.0.1:5000/api/stream/{t['videoId']}"
                } for t in radio['tracks'] if 'videoId' in t]
        except: pass

        # 2. Get User Taste Radio (If logged in)
        taste_tracks = []
        current_user_id = optional_get_identity()
        if current_user_id:
            try:
                user = User.query.get(current_user_id)
                if user:
                    # Collect seeds from likes and history
                    seeds = [t.video_id for t in user.liked_tracks[-5:]]
                    # Add history
                    history = RecentlyPlayed.query.filter_by(user_id=current_user_id).order_by(RecentlyPlayed.last_played.desc()).limit(5).all()
                    seeds += [h.track.video_id for h in history if h.track]
                    unique_seeds = list(set(seeds))
                    
                    if unique_seeds:
                        # Pick a random seed different from current video if possible
                        valid_seeds = [s for s in unique_seeds if s != video_id]
                        seed_id = random.choice(valid_seeds) if valid_seeds else video_id
                        
                        user_radio = yt.get_watch_playlist(videoId=seed_id, limit=20)
                        if 'tracks' in user_radio:
                            taste_tracks = [{
                                'id': t['videoId'],
                                'title': t['title'],
                                'artist': t['artists'][0]['name'] if 'artists' in t else 'Unknown',
                                'cover': t.get('thumbnails', t.get('thumbnail', [{'url':''}]))[-1]['url'],
                                'duration': '0:00',
                                'stream_url': f"http://127.0.0.1:5000/api/stream/{t['videoId']}"
                            } for t in user_radio['tracks'] if 'videoId' in t]
            except Exception as e:
                print(f"Taste fetch error: {e}")

        # 3. Interleave Results (Radio, Taste, Radio, Taste...)
        final_list = []
        max_len = max(len(radio_tracks), len(taste_tracks))
        seen_ids = set([video_id]) # Don't repeat current song

        for i in range(max_len):
            # Add from Radio
            if i < len(radio_tracks):
                track = radio_tracks[i]
                if track['id'] not in seen_ids:
                    final_list.append(track)
                    seen_ids.add(track['id'])
            
            # Add from Taste
            if i < len(taste_tracks):
                track = taste_tracks[i]
                if track['id'] not in seen_ids:
                    final_list.append(track)
                    seen_ids.add(track['id'])
        
        return jsonify(final_list)
    except Exception as e: 
        print(f"Get Radio Error: {e}")
        return jsonify([])

@content_bp.route('/discover/<category>', methods=['GET'])
def get_discover(category):
    try:
        query = {
            'featured': "Global Top 50",
            'electronic': "Electronic Dance Music Hits",
            'hiphop': "Hip Hop R&B Hits",
            'trending': "Trending Songs"
        }.get(category, f"{category} music")

        results = yt.search(query, filter='songs', limit=10)
        data = []
        for r in results:
            if 'videoId' in r:
                data.append({
                    'id': r['videoId'],
                    'title': r['title'],
                    'artist': r['artists'][0]['name'] if 'artists' in r else 'Unknown',
                    'cover': r['thumbnails'][-1]['url'] if 'thumbnails' in r else '',
                    'duration': r.get('duration', '0:00'),
                    'stream_url': f"http://127.0.0.1:5000/api/stream/{r['videoId']}"
                })
        return jsonify(data)
    except: return jsonify([])
