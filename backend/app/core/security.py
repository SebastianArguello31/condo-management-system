# Generación y comprobación de hashes bcrypt y tokens de acceso JWT.
# Los tokens incluyen expiración y versión de sesión para permitir su invalidación.
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

def create_access_token(user_id, session_version=0):
    # La comprobación exacta de tipo también excluye booleanos, que Python trata como enteros.
    if type(session_version) is not int or session_version < 0:
        raise ValueError("Versión de sesión inválida")

    now = datetime.now(timezone.utc)
    lifetime = timedelta(
        hours=current_app.config["JWT_ACCESS_TOKEN_HOURS"]
    )

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + lifetime,
        "ver": session_version,
    }

    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )

def decode_access_token(token):
    # Fija el algoritmo aceptado y exige los campos usados para identificar y caducar la sesión.
    payload = jwt.decode(
        token,
        current_app.config["JWT_SECRET_KEY"],
        algorithms=["HS256"],
        options={"require": ["sub", "iat", "exp", "ver"]},
    )

    version = payload["ver"]

    if type(version) is not int or version < 0:
        raise jwt.InvalidTokenError("Versión de sesión inválida")

    return payload