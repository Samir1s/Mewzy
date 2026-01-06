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

@player_bp.route('/version')
def version():
    return jsonify({
        'version': '1.5.0', 
        'strategies': ['ios', 'android', 'cobalt', 'piped', 'invidious'],
        'status': 'active'
    })

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@player_bp.route('/proxy_image')
def proxy_image():
    url = request.args.get('url')
    if not url: return jsonify({'error': 'No URL provided'}), 400
    try:
        # Use a standard browser User-Agent
        req_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Verify=False to bypass SSL issues on Render/cloud environments
        # stream=True ensures we don't load massive files into memory at once
        resp = requests.get(url, headers=req_headers, stream=True, timeout=10, verify=False)
        
        # If upstream failed, pass that status code along (don't error out 500)
        if resp.status_code != 200:
             return jsonify({'error': f'Upstream error {resp.status_code}'}), resp.status_code

        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items()
                   if name.lower() not in excluded_headers]
        
        response = make_response(resp.content)
        for name, value in headers:
            response.headers[name] = value
            
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        print(f"Proxy Error for {url}: {e}")
        return jsonify({'error': 'Failed to fetch image'}), 500

# Cache for Piped instances
piped_instances_cache = []
last_piped_fetch = 0

def get_healthy_piped_instances():
    global piped_instances_cache, last_piped_fetch
    import time
    if piped_instances_cache and (time.time() - last_piped_fetch < 3600): # Cache for 1 hour
        return piped_instances_cache

    try:
        print("[Player] Fetching fresh Piped instances...")
        res = requests.get("https://piped-instances.kavin.rocks/", timeout=5)
        if res.status_code == 200:
            instances = res.json()
            # Filter: up-to-date, healthy, and has https
            healthy = [
                i['api_url'] for i in instances 
                if i.get('api_url') and i.get('uptime_24h', 0) > 90 and 'https' in i['api_url']
            ]
            # Prioritize official/known fast ones if in the list
            priority = ["https://piped.video", "https://piped.mha.fi"]
            sorted_instances = [h for h in healthy if h in priority] + [h for h in healthy if h not in priority]
            
            piped_instances_cache = sorted_instances[:8] # Keep top 8
            last_piped_fetch = time.time()
            return piped_instances_cache
    except Exception as e:
        print(f"[Player] Failed to fetch Piped instances: {e}")
    
    # Fallback if fetch fails
    return ["https://piped.video", "https://piped.mha.fi", "https://piped.smnz.de", "https://piped.kavin.rocks"]

@player_bp.route('/stream/<video_id>')
def stream_track(video_id):
    try:
        # Sanitize video_id
        video_id = video_id.replace('*', '').strip()
        url = None
        
        # Helper logs
        def get_proxy_headers():
             return {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.google.com/'
            }

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

        # Strategy 3: YoutubeDL (Web Client - Fallback)
        if not url:
            try:
                ydl_opts = {
                    'quiet': True,
                    'format': 'bestaudio/best',
                    'nocheckcertificate': True,
                    'extractor_args': {'youtube': {'player_client': ['web']}}
                }
                with YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_id, download=False)
                    url = info.get('url')
            except Exception as e:
                print(f"Strategy 3 (Web) failed: {e}")

        # Strategy 3.5: YoutubeDL (TV Client - Last Resort)
        if not url:
            try:
                ydl_opts = {
                    'quiet': True,
                    'format': 'bestaudio/best',
                    'nocheckcertificate': True,
                    'extractor_args': {'youtube': {'player_client': ['tv']}}
                }
                with YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_id, download=False)
                    url = info.get('url')
            except Exception as e:
                print(f"Strategy 3.5 (TV) failed: {e}")

        # Strategy 4: Cobalt API (High Reliability - Simplified Payload)
        if not url:
            try:
                cobalt_headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
                # Minimal payload to avoid validation errors (400)
                payload = {
                    'url': f'https://www.youtube.com/watch?v={video_id}',
                    'downloadMode': 'audio'
                }
                print(f"Strategy 4 (Cobalt POST): Requesting...")
                cobalt_res = requests.post('https://api.cobalt.tools/api/json', json=payload, headers=cobalt_headers, timeout=6, verify=False)
                if cobalt_res.status_code == 200:
                    data = cobalt_res.json()
                    if 'url' in data:
                        url = data['url']
                        print(f"Strategy 4 Success: Found URL via Cobalt POST")
                
                # Fallback to GET on a known backup instance if main fails
                if not url:
                     print(f"Strategy 4 (Cobalt GET): Requesting backup...")
                     # Use a backup instance that supports GET or is less strict
                     # Public instances: https://cobalt.kwiatekmiki.pl, https://api.cobalt.tools
                     # Try backup instance
                     cobalt_res = requests.post('https://cobalt.kwiatekmiki.pl/api/json', json=payload, headers=cobalt_headers, timeout=6, verify=False)
                     if cobalt_res.status_code == 200:
                        data = cobalt_res.json()
                        if 'url' in data:
                            url = data['url']
                            print(f"Strategy 4 Success: Found URL via Cobalt Backup")

            except Exception as e:
                print(f"Strategy 4 (Cobalt) failed: {e}")

        # Strategy 5: Invidious API (Promoted to 5th - higher success chance than Piped usually)
        if not url:
             # Try Invidious first, sometimes more reliable for raw streams
            invidious_instances = [
                "https://inv.nadeko.net",
                "https://invidious.privacyredirect.com",
                "https://yewtu.be",
                "https://invidious.f5.si"
            ]
            for host in invidious_instances:
                try:
                    print(f"Strategy 5 (Invidious): Trying {host}...")
                    inv_res = requests.get(f"{host}/api/v1/videos/{video_id}", headers=get_proxy_headers(), timeout=5, verify=False)
                    if inv_res.status_code == 200:
                        data = inv_res.json()
                        if 'formatStreams' in data:
                            audio_streams = [s for s in data['formatStreams'] if 'audio' in s.get('type', '')]
                            if not audio_streams and 'adaptiveFormats' in data:
                                audio_streams = [s for s in data['adaptiveFormats'] if 'audio' in s.get('type', '')]
                            
                            if audio_streams:
                                url = audio_streams[0]['url']
                                print(f"Strategy 5 Success: Found URL via {host}")
                                break
                except Exception as ex:
                    print(f"Strategy 5 ({host}) failed: {ex}")

        # Strategy 6: Piped API (Dynamic & Healthy)
        if not url:
            piped_instances = get_healthy_piped_instances()
            for host in piped_instances:
                try:
                    print(f"Strategy 6 (Piped): Trying {host}...")
                    piped_res = requests.get(f"{host}/streams/{video_id}", headers=get_proxy_headers(), timeout=5, verify=False)
                    
                    # Cloudflare check
                    if piped_res.status_code == 200:
                        if piped_res.text.strip().startswith('<'): # HTML detected
                            print(f"Strategy 6 ({host}) blocked by Cloudflare (HTML response).")
                            continue

                        data = piped_res.json()
                        audio_streams = [s for s in data.get('audioStreams', []) if s.get('mimeType') and ('audio/mpeg' in s['mimeType'] or 'mp4' in s['mimeType'])]
                        if audio_streams:
                            audio_streams.sort(key=lambda x: x.get('bitrate', 0), reverse=True)
                            url = audio_streams[0]['url']
                            print(f"Strategy 6 Success: Found URL via {host}")
                            break
                    elif piped_res.status_code in [403, 503, 429]:
                        print(f"Strategy 6 ({host}) blocked: {piped_res.status_code}")
                except Exception as ex:
                    print(f"Strategy 6 ({host}) failed: {ex}")

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
        req = requests.get(url, headers=proxy_headers, stream=True, timeout=10, verify=False)
        
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
@player_bp.route('/debug_stream/<video_id>')
def debug_stream(video_id):
    # Sanitize video_id
    video_id = video_id.replace('*', '').strip()
    
    logs = []
    success_url = None
    
    def log(msg):
        logs.append(msg)
        print(f"[DebugStream] {msg}")

    try:
        # Helper logs
        def get_proxy_headers():
            return {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.google.com/'
            }

        # Strategy 1: iOS
        try:
            log("Starting Strategy 1 (iOS)...")
            ydl_opts = { 'quiet': True, 'format': 'bestaudio/best', 'nocheckcertificate': True, 'extractor_args': {'youtube': {'player_client': ['ios']}} }
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_id, download=False)
                if info.get('url'): success_url = info['url']; log("Strategy 1 Success")
        except Exception as e: log(f"Strategy 1 Error: {e}")

        # Strategy 2: Android
        if not success_url:
            try:
                log("Starting Strategy 2 (Android)...")
                ydl_opts = { 'quiet': True, 'format': 'bestaudio/best', 'nocheckcertificate': True, 'extractor_args': {'youtube': {'player_client': ['android']}} }
                with YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_id, download=False)
                    if info.get('url'): success_url = info['url']; log("Strategy 2 Success")
            except Exception as e: log(f"Strategy 2 Error: {e}")
            
        # Strategy 3: Web Client
        if not success_url:
            try:
                log("Starting Strategy 3 (Web)...")
                ydl_opts = { 'quiet': True, 'format': 'bestaudio/best', 'nocheckcertificate': True, 'extractor_args': {'youtube': {'player_client': ['web']}} }
                with YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_id, download=False)
                    if info.get('url'): success_url = info['url']; log("Strategy 3 Success")
            except Exception as e: log(f"Strategy 3 Error: {e}")

        # Strategy 3.5: TV Client
        if not success_url:
            try:
                log("Starting Strategy 3.5 (TV)...")
                ydl_opts = { 'quiet': True, 'format': 'bestaudio/best', 'nocheckcertificate': True, 'extractor_args': {'youtube': {'player_client': ['tv']}} }
                with YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_id, download=False)
                    if info.get('url'): success_url = info['url']; log("Strategy 3.5 Success")
            except Exception as e: log(f"Strategy 3.5 Error: {e}")

        # Strategy 4: Cobalt
        if not success_url:
            try:
                log("Starting Strategy 4 (Cobalt)...")
                # Minimal payload from strategy
                payload = { 'url': f'https://www.youtube.com/watch?v={video_id}', 'downloadMode': 'audio' }
                res = requests.post('https://api.cobalt.tools/api/json', json=payload, headers={'Accept': 'application/json', 'Content-Type': 'application/json'}, timeout=6)
                log(f"Cobalt Status: {res.status_code}")
                if res.status_code == 200 and 'url' in res.json(): success_url = res.json()['url']; log("Strategy 4 Success")
                else:
                    # Backup
                    log("Cobalt Backup...")
                    res = requests.post('https://cobalt.kwiatekmiki.pl/api/json', json=payload, headers={'Accept': 'application/json', 'Content-Type': 'application/json'}, timeout=6)
                    if res.status_code == 200 and 'url' in res.json(): success_url = res.json()['url']; log("Strategy 4 Backup Success")
            except Exception as e: log(f"Strategy 4 Error: {e}")

        # Strategy 5: Invidious (Promoted)
        if not success_url:
            for host in ["https://inv.nadeko.net", "https://invidious.privacyredirect.com", "https://yewtu.be", "https://invidious.f5.si"]:
                try:
                    log(f"Strategy 5 (Invidious {host})...")
                    res = requests.get(f"{host}/api/v1/videos/{video_id}", headers=get_proxy_headers(), timeout=5)
                    log(f"Invidious {host} Status: {res.status_code}")
                    if res.status_code == 200:
                         d = res.json()
                         if d.get('formatStreams') or d.get('adaptiveFormats'): success_url = "found_in_invidious"; log("Strategy 5 Success"); break
                except Exception as e: log(f"Strategy 5 Error {host}: {e}")

        # Strategy 6: Piped (Dynamic)
        if not success_url:
            piped_instances = get_healthy_piped_instances()
            for host in piped_instances:
                try:
                    log(f"Strategies 6 (Piped {host})...")
                    res = requests.get(f"{host}/streams/{video_id}", headers=get_proxy_headers(), timeout=5)
                    log(f"Piped {host} Status: {res.status_code}")
                    
                    if res.status_code == 200:
                        if res.text.strip().startswith('<'):
                             log(f"Strategy 6 Failed: Cloudflare HTML detected")
                             continue
                        if res.json().get('audioStreams'): 
                            success_url = res.json()['audioStreams'][0]['url']
                            log("Strategy 6 Success")
                            break
                except Exception as e: log(f"Strategy 6 Error {host}: {e}")

        return jsonify({'video_id': video_id, 'success': success_url is not None, 'logs': logs})

    except Exception as e: return jsonify({'error': str(e), 'logs': logs}), 500
