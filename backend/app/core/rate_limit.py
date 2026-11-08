import hashlib
import hmac

from flask import current_app, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    key_prefix="condominio",
)

def recovery_email_key():
    data = request.get_json(silent=True)

    email = data.get("email") if isinstance(data, dict) else None

    if not isinstance(email, str):
        return f"invalid:{get_remote_address()}"

    normalized_email = email.strip().lower()

    secret = current_app.config["JWT_SECRET_KEY"].encode("utf-8")
    digest = hmac.new(
        secret,
        normalized_email.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return f"email:{digest}"