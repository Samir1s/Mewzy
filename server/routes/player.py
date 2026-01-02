import os
import glob
import requests
from flask import Blueprint, jsonify, request, make_response
from yt_dlp import YoutubeDL
from ytmusicapi import YTMusic
from server.config import Config

player_bp = Blueprint('player', __name__)
yt = YTMusic()
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg', 'm4a'}

@player_bp.route('/proxy_image')
def proxy_image():
    url = request.args.get('url')
    if not url: return jsonify({'error': 'No URL provided'}), 400
    try:
        req_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        resp = requests.get(url, headers=req_headers, stream=True, timeout=5)
        
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items()
                   if name.lower() not in excluded_headers]
        response = make_response(resp.content)
        for name, value in headers:
            response.headers[name] = value
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
    except Exception as e:
        print(f"Proxy Error: {e}")
        return jsonify({'error': 'Failed to fetch image'}), 500

@player_bp.route('/stream/<video_id>')
def stream_track(video_id):
    file_path = None
    
    for ext in ALLOWED_EXTENSIONS:
        temp_path = os.path.join(Config.UPLOAD_FOLDER, f"{video_id}.{ext}")
        if os.path.exists(temp_path):
            file_path = temp_path
            break

    if not file_path:
        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(Config.UPLOAD_FOLDER, f'{video_id}.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'nocheckcertificate': True,
            }
            with YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

            found = glob.glob(os.path.join(Config.UPLOAD_FOLDER, f"{video_id}.*"))
            if found:
                file_path = found[0]
            else:
                return jsonify({'error': 'Download failed'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    range_header = request.headers.get('Range', None)
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    file_size = os.path.getsize(file_path)
    start = 0
    end = file_size - 1

    if range_header:
        try:
            ranges = range_header.strip().split('=')[1]
            start_str, end_str = ranges.split('-')
            if start_str: start = int(start_str)
            if end_str: end = int(end_str)
        except Exception:
            start = 0
            end = file_size - 1

    if start > end or start >= file_size:
        return jsonify({'error': 'Invalid range'}), 416

    length = end - start + 1

    def generate():
        with open(file_path, 'rb') as f:
            f.seek(start)
            remaining = length
            chunk_size = 8192
            while remaining > 0:
                read_size = min(chunk_size, remaining)
                data = f.read(read_size)
                if not data: break
                remaining -= len(data)
                yield data

    rv = make_response(generate(), 206 if range_header else 200)
    rv.headers.add('Content-Type', 'audio/mpeg')
    rv.headers.add('Accept-Ranges', 'bytes')
    rv.headers.add('Content-Length', str(length))
    if range_header:
        rv.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
        rv.status_code = 206
    rv.headers['Access-Control-Allow-Origin'] = '*'
    return rv

@player_bp.route('/lyrics/<video_id>', methods=['GET'])
def get_lyrics(video_id):
    try:
        # Synced Lyrics (LRCLIB)
        song_info = yt.get_song(video_id)
        title = song_info['videoDetails']['title']
        artist = song_info['videoDetails']['author']
        duration = int(song_info['videoDetails']['lengthSeconds'])

        try:
            lrc_url = f"https://lrclib.net/api/get?artist_name={artist}&track_name={title}&duration={duration}"
            lrc_res = requests.get(lrc_url, timeout=3)
            if lrc_res.status_code == 200:
                data = lrc_res.json()
                if data.get('syncedLyrics'):
                    return jsonify({'type': 'synced', 'lyrics': data['syncedLyrics']})
                elif data.get('plainLyrics'):
                    return jsonify({'type': 'plain', 'lyrics': data['plainLyrics']})
        except: pass

        # Fallback
        watch_data = yt.get_watch_playlist(videoId=video_id)
        if 'lyrics' in watch_data and watch_data['lyrics']:
            lyrics_data = yt.get_lyrics(browseId=watch_data['lyrics'])
            if lyrics_data and 'lyrics' in lyrics_data:
                return jsonify({'type': 'plain', 'lyrics': lyrics_data['lyrics']})
        
        return jsonify({'error': 'Lyrics not found'}), 404
    except Exception as e:
        print(f"Lyrics Error: {e}")
        return jsonify({'error': 'Lyrics unavailable'}), 404
