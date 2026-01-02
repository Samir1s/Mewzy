from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from server.models import db, User, FriendRequest, Playlist
from sqlalchemy import or_

social_bp = Blueprint('social', __name__)

@social_bp.route('/users/search', methods=['GET'])
def search_users():
    query = request.args.get('q', '')
    if not query: return jsonify([])
    
    users = User.query.filter(User.username.ilike(f"%{query}%")).limit(10).all()
    results = []
    
    current_user_id = None
    try: current_user_id = int(get_jwt_identity() or 0)
    except: pass

    for u in users:
        if u.id == current_user_id: continue
        
        status = 'none'
        if current_user_id:
            # Check friendship status
            fr = FriendRequest.query.filter(
                ((FriendRequest.sender_id == current_user_id) & (FriendRequest.receiver_id == u.id)) |
                ((FriendRequest.sender_id == u.id) & (FriendRequest.receiver_id == current_user_id))
            ).first()
            if fr:
                status = 'friend' if fr.status == 'accepted' else ('sent' if fr.sender_id == current_user_id else 'received')

        results.append({
            'id': u.id,
            'username': u.username,
            'profile_pic': u.profile_pic,
            'status': status
        })
        
    return jsonify(results)

@social_bp.route('/friends/request/<int:user_id>', methods=['POST'])
@jwt_required()
def send_request(user_id):
    current_id = int(get_jwt_identity())
    if current_id == user_id: return jsonify({'error': 'Cannot add self'}), 400
    
    existing = FriendRequest.query.filter(
        ((FriendRequest.sender_id == current_id) & (FriendRequest.receiver_id == user_id)) |
        ((FriendRequest.sender_id == user_id) & (FriendRequest.receiver_id == current_id))
    ).first()
    
    if existing:
        if existing.status == 'accepted': return jsonify({'message': 'Already friends'}), 200
        if existing.sender_id == current_id: return jsonify({'message': 'Request already sent'}), 200
        # If existing request from them, accept it? Logic could be added here.
        return jsonify({'error': 'Pending request exists'}), 400
        
    req = FriendRequest(sender_id=current_id, receiver_id=user_id, status='pending')
    db.session.add(req)
    db.session.commit()
    return jsonify({'message': 'Request sent'}), 201

@social_bp.route('/friends/accept/<int:sender_id>', methods=['POST'])
@jwt_required()
def accept_request(sender_id):
    current_id = int(get_jwt_identity())
    req = FriendRequest.query.filter_by(sender_id=sender_id, receiver_id=current_id, status='pending').first()
    
    if not req: return jsonify({'error': 'No pending request'}), 404
    
    req.status = 'accepted'
    db.session.commit()
    return jsonify({'message': 'Friend accepted'}), 200

@social_bp.route('/friends', methods=['GET'])
@jwt_required()
def get_friends():
    current_id = int(get_jwt_identity())
    
    # Received Requests
    received = FriendRequest.query.filter_by(receiver_id=current_id, status='pending').all()
    requests_data = [{
        'id': r.sender.id,
        'username': r.sender.username,
        'profile_pic': r.sender.profile_pic
    } for r in received]
    
    # Friends (Both directions)
    friends_query = FriendRequest.query.filter(
        ((FriendRequest.sender_id == current_id) | (FriendRequest.receiver_id == current_id)) & 
        (FriendRequest.status == 'accepted')
    ).all()
    
    friends_data = []
    for f in friends_query:
        u = f.receiver if f.sender_id == current_id else f.sender
        friends_data.append({
            'id': u.id,
            'username': u.username,
            'profile_pic': u.profile_pic,
            'bio': u.bio
        })
        
    return jsonify({'requests': requests_data, 'friends': friends_data})

@social_bp.route('/user/<int:user_id>', methods=['GET'])
def get_public_profile(user_id):
    user = User.query.get_or_404(user_id)
    playlists = Playlist.query.filter_by(user_id=user_id).all() # Only public playlists logic if added later
    
    status = 'none'
    try:
        current_id = int(get_jwt_identity())
        if current_id:
            fr = FriendRequest.query.filter(
                ((FriendRequest.sender_id == current_id) & (FriendRequest.receiver_id == user_id)) |
                ((FriendRequest.sender_id == user_id) & (FriendRequest.receiver_id == current_id))
            ).first()
            if fr:
                status = 'friend' if fr.status == 'accepted' else ('sent' if fr.sender_id == current_id else 'received')
    except: pass
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'profile_pic': user.profile_pic,
        'banner_url': user.banner_url,
        'bio': user.bio,
        'playlists': [{'id': p.id, 'name': p.name, 'track_count': len(p.tracks)} for p in playlists],
        'status': status
    })
