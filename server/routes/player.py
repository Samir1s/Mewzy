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
        url = None
        
        # Strategy 1: YoutubeDL (iOS Client)
        try:
            ydl_opts = {
                'quiet': True,
                'format': 'bestaudio/best',
                'nocheckcertificate': True,
                'extractor_args': {'youtube': {'player_client': ['ios']}}
            }
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_id, download=False)
                url = info.get('url')
        except Exception as e:
            print(f"Strategy 1 (iOS) failed: {e}")

        # Strategy 2: YoutubeDL (Android Client)
        if not url:
            try:
                ydl_opts = {
                    'quiet': True,
                    'format': 'bestaudio/best',
                    'nocheckcertificate': True,
                    'extractor_args': {'youtube': {'player_client': ['android']}}
                }
                with YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_id, download=False)
                    url = info.get('url')
            except Exception as e:
                print(f"Strategy 2 (Android) failed: {e}")

        # Strategy 3: Cobalt API (High Reliability)
        if not url:
            try:
                cobalt_headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
                payload = {
                    'url': f'https://www.youtube.com/watch?v={video_id}',
                    'aFormat': 'mp3',
                    'isAudioOnly': True
                }
                print(f"Strategy 3 (Cobalt): Requesting...")
                cobalt_res = requests.post('https://api.cobalt.tools/api/json', json=payload, headers=cobalt_headers, timeout=6)
                if cobalt_res.status_code == 200:
                    data = cobalt_res.json()
                    if 'url' in data:
                        url = data['url']
                        print(f"Strategy 3 Success: Found URL via Cobalt")
            except Exception as e:
                print(f"Strategy 3 (Cobalt) failed: {e}")

        # Strategy 4: Piped API (Multi-Instance Fallback)
        if not url:
            piped_instances = [
                "https://pipedapi.kavin.rocks",
                "https://pipedapi.system41.cl", 
                "https://api.piped.privacydev.net",
                "https://pipedapi.drgns.space"
            ]
            for host in piped_instances:
                try:
                    print(f"Strategy 4 (Piped): Trying {host}...")
                    piped_res = requests.get(f"{host}/streams/{video_id}", timeout=4)
                    if piped_res.status_code == 200:
                        data = piped_res.json()
                        audio_streams = [s for s in data['audioStreams'] if s['mimeType'] == 'audio/mpeg' or 'mp4' in s['mimeType']]
                        if audio_streams:
                            audio_streams.sort(key=lambda x: x.get('bitrate', 0), reverse=True)
                            url = audio_streams[0]['url']
                            print(f"Strategy 4 Success: Found URL via {host}")
                            break
                except Exception as ex:
                    print(f"Strategy 4 ({host}) failed: {ex}")

        # Strategy 5: Invidious API (Final Fallback)
        if not url:
            invidious_instances = [
                "https://inv.tux.pizza",
                "https://invidious.jing.rocks",
                "https://invidious.nerdvpn.de",
                "https://vid.uff.anzeige.io"
            ]
            for host in invidious_instances:
                try:
                    print(f"Strategy 5 (Invidious): Trying {host}...")
                    inv_res = requests.get(f"{host}/api/v1/videos/{video_id}", timeout=5)
                    if inv_res.status_code == 200:
                        data = inv_res.json()
                        if 'formatStreams' in data:
                            # Filter for audio/mpeg or mp4 audio
                            audio_streams = [s for s in data['formatStreams'] if s.get('type') and ('audio/mpeg' in s['type'] or 'mp4' in s['type'])]
                            # If no explicit audio streams (Invidious sometimes mixes), check adaptiveFormats
                            if not audio_streams and 'adaptiveFormats' in data:
                                audio_streams = [s for s in data['adaptiveFormats'] if s.get('type') and ('audio/mpeg' in s['type'] or 'mp4' in s['type'])]
                            
                            if audio_streams:
                                # Sort by bitrate/quality
                                # Invidious uses 'bitrate' (sometimes string) or 'qualityLabel'
                                # Safer to just take the first one or try to parse bitrate
                                url = audio_streams[0]['url']
                                print(f"Strategy 5 Success: Found URL via {host}")
                                break
                except Exception as ex:
                    print(f"Strategy 5 ({host}) failed: {ex}")

        if not url:
            return jsonify({'error': 'All streaming strategies failed'}), 500
        
        # 2. Prepare headers with browser impersonation
        proxy_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Referer': 'https://www.youtube.com/'
        }
        
        range_header = request.headers.get('Range')
        if range_header:
            proxy_headers['Range'] = range_header

        # 3. Create Response (Stream Proxy)
        req = requests.get(url, headers=proxy_headers, stream=True, timeout=10)
        
        if req.status_code in [403, 410]:
             return jsonify({'error': f'Upstream Error ({req.status_code})'}), 500
            
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
