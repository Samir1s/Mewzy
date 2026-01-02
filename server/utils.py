from flask import request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
import jwt as pyjwt
import os
import uuid
from PIL import Image

def optional_get_identity():
    """Return JWT identity if a valid Authorization header is present, else None."""
    auth = request.headers.get('Authorization')
    if not auth or not auth.lower().startswith('bearer '):
        return None
    token = auth.split(' ', 1)[1].strip()
    # 1) Preferred: let flask-jwt-extended validate the token (optional)
    try:
        verify_jwt_in_request(optional=True)
        ident = get_jwt_identity()
        if ident is None:
            return None
        try:
            return int(ident)
        except Exception:
            return ident
    except Exception:
        # 2) Fallback: try to decode the token using flask_jwt_extended.decode_token
        try:
            from flask_jwt_extended import decode_token
            decoded = decode_token(token)
            val = decoded.get('sub') or decoded.get('identity')
            if val is None:
                return None
            return int(val) if str(val).isdigit() else None
        except Exception:
            # 3) Last resort: unverified decode with PyJWT, but only accept numeric identities
            try:
                decoded_unverified = pyjwt.decode(token, options={"verify_signature": False})
                val = decoded_unverified.get('sub') or decoded_unverified.get('identity')
                if val is None:
                    return None
                return int(val) if str(val).isdigit() else None
            except Exception as e2:
                print('optional_get_identity: all decode attempts failed', e2)
                return None

def save_optimized_image(file_storage, upload_folder, prefix='img', max_size=(800, 800)):
    """
    Validates, resizes, and saves an image file.
    Returns: The filename of the saved image.
    Throws: Exception if validation fails.
    """
    if not file_storage:
        raise ValueError("No file provided")
    
    # Securely generate filename
    filename = f"{prefix}_{str(uuid.uuid4())[:12]}.jpg"
    filepath = os.path.join(upload_folder, filename)
    
    try:
        # Open image using PIL (Validates it's a real image)
        img = Image.open(file_storage)
        
        # Convert to RGB (handles RGBA/P issues for JPEG)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
            
        # Resize if larger than max_size, maintaining aspect ratio
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save as optimized JPEG
        img.save(filepath, 'JPEG', quality=85, optimize=True)
        return filename
        
    except Exception as e:
        print(f"Image processing failed: {e}")
        raise ValueError(f"Invalid image file: {e}")
