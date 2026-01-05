import os
import glob
import requests
from flask import Blueprint, jsonify, request, make_response, Response
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
    try:
        # 1. Get Direct Stream URL
        ydl_opts = {
            'quiet': True,
            'format': 'bestaudio/best',
            'nocheckcertificate': True,
            # 'ios' client often avoids age-gates/throttling in data centers
            'extractor_args': {'youtube': {'player_client': ['ios']}} 
        }
        with YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(video_id, download=False)
                url = info['url']
            except Exception as e:
                # Fallback to standard client if ios fails
                print(f"iOS client failed, retrying default: {e}")
                ydl.params['extractor_args'] = {}
                info = ydl.extract_info(video_id, download=False)
                url = info['url']
        
        # 2. Prepare headers
        # Use a real browser User-Agent to avoid 403 Forbidden from Google Video servers
        proxy_headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            'Accept': '*/*'
        }
        
        range_header = request.headers.get('Range')
        if range_header:
            proxy_headers['Range'] = range_header

        # 3. Stream from YouTube (Forwarding headers)
        def generate():
            with requests.get(url, headers=proxy_headers, stream=True) as r:
                # If upstream returns 403, we must fail gracefully
                if r.status_code == 403:
                    # In a generator we can't easily change the status code, 
                    # but we can stop yielding. The client will just hear silence/error.
                    return
                for chunk in r.iter_content(chunk_size=4096):
                    if chunk: yield chunk

        # 4. Create Response
        req = requests.get(url, headers=proxy_headers, stream=True)
        
        # If the video server blocks us, return 500 text
        if req.status_code == 403:
            return jsonify({'error': 'Upstream Forbidden (403)'}), 500
            
        return Response(
            req.iter_content(chunk_size=4096),
            status=req.status_code,
            headers={
                'Content-Type': req.headers.get('Content-Type', 'audio/mpeg'),
                'Content-Length': req.headers.get('Content-Length'),
                'Content-Range': req.headers.get('Content-Range'),
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*'
            }
        )

    except Exception as e:
        print(f"Stream Error: {e}")
        return jsonify({'error': str(e)}), 500

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
