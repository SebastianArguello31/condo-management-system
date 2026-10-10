import bcrypt
import jwt
from flask import current_app
from datetime import datetime, timedelta, timezone

from app.core.passwords import validate_password

def hash_password(password):
    validate_password(password)
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")

def verify_password(password, password_hash):
    if not isinstance(password, str) or not isinstance(password_hash, str):
        return False

    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        return False

    try:
        return bcrypt.checkpw(password_bytes, password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False

def create_access_token(user_id):
    now = datetime.now(timezone.utc)
    lifetime = timedelta(hours=current_app.config["JWT_ACCESS_TOKEN_HOURS"])
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + lifetime,
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

def decode_access_token(token):
    return jwt.decode(
        token,
        current_app.config["JWT_SECRET_KEY"],
        algorithms=["HS256"],
        options={"require": ["sub", "iat", "exp"]},
    )