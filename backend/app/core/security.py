from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from flask import current_app

def hash_password(password):
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

def check_password(password, password_hash):
    # bcrypt admite como máximo 72 bytes.
    if len(password.encode("utf-8")) > 72:
        return False

    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False

def create_access_token(user_id):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(
            hours=current_app.config["JWT_ACCESS_TOKEN_HOURS"]
        ),
    }

    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )

def decode_access_token(token):
    return jwt.decode(
        token,
        current_app.config["JWT_SECRET_KEY"],
        algorithms=["HS256"],
        options={"require": ["sub", "iat", "exp"]},
    )