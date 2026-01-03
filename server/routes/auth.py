from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from server.models import db, User
from server.config import Config
from flask_limiter import Limiter
from flask import send_from_directory
import os
import uuid
from flask_limiter.util import get_remote_address
from server.extensions import limiter
from server.utils import save_optimized_image

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.json
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        if User.query.filter_by(username=data.get('username')).first():
            return jsonify({'error': 'Username already exists'}), 400
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({'error': 'Email already exists'}), 400
            
        new_user = User(
            username=data.get('username'),
            email=data.get('email')
        )
        new_user.set_password(data.get('password'))
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])

@limiter.limit("10 per minute")
def login():
    data = request.json
    user = User.query.filter_by(email=data.get('email')).first()
    if user and user.check_password(data.get('password')):
        token = create_access_token(identity=str(user.id))
        return jsonify({
            'token': token, 
            'id': user.id,
            'username': user.username, 
            'is_admin': user.is_admin,
            'profile_pic': user.profile_pic
        }), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/user/update', methods=['PUT'], strict_slashes=False)
@jwt_required()
def update_user():
    try:
        current_id = get_jwt_identity()
        user = User.query.get(current_id)
        if not user: return jsonify({'error': 'User not found'}), 404
        
        data = request.json
        new_username = data.get('username')
        new_email = data.get('email')
        new_pic = data.get('profile_pic')

        if new_username:
            if User.query.filter(User.username == new_username, User.id != current_id).first():
                return jsonify({'error': 'Username taken'}), 400
            user.username = new_username
        
        if new_email:
            if User.query.filter(User.email == new_email, User.id != current_id).first():
                return jsonify({'error': 'Email taken'}), 400
            user.email = new_email
            
        if new_pic:
            user.profile_pic = new_pic
            
        if data.get('banner_url'):
            user.banner_url = data.get('banner_url')
            
        if data.get('bio'):
            user.bio = data.get('bio')
            
        db.session.commit()
        return jsonify({
            'message': 'Profile updated', 
            'username': user.username, 
            'email': user.email,
            'profile_pic': user.profile_pic,
            'banner_url': user.banner_url,
            'bio': user.bio
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    return jsonify({
        'username': user.username,
        'email': user.email,
        'is_admin': user.is_admin,
        'profile_pic': user.profile_pic,
        'banner_url': user.banner_url,
        'bio': user.bio,
        'playlist_count': len(user.playlists),
        'liked_count': len(user.liked_tracks)
    }), 200

@auth_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

@auth_bp.route('/user/upload-avatar', methods=['POST'], strict_slashes=False)
@jwt_required()
def upload_avatar():
    try:
        if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
        file = request.files['file']
        if file.filename == '': return jsonify({'error': 'No file'}), 400
        
        current_id = get_jwt_identity()
        user = User.query.get(current_id)

        filename = save_optimized_image(file, Config.UPLOAD_FOLDER, prefix=f"avatar_{current_id}")
        
        url = f"/api/uploads/{filename}"
        user.profile_pic = url
        db.session.commit()
        
        return jsonify({'url': url}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/user/upload-banner', methods=['POST'], strict_slashes=False)
@jwt_required()
def upload_banner():
    try:
        if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
        file = request.files['file']
        if file.filename == '': return jsonify({'error': 'No file'}), 400
        
        current_id = get_jwt_identity()
        user = User.query.get(current_id)
        
        filename = save_optimized_image(file, Config.UPLOAD_FOLDER, prefix=f"banner_{current_id}", max_size=(1500, 500))
        
        url = f"/api/uploads/{filename}"
        user.banner_url = url
        db.session.commit()
        
        return jsonify({'url': url}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
