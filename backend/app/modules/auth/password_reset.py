# Emisión y consumo de tokens de recuperación de un solo uso.
# El cambio de contraseña y la invalidación de enlaces se realizan en una misma transacción.
import hashlib
import secrets

from werkzeug.exceptions import BadRequest

from app.core.db_helpers import transaction
from app.core.security import hash_password
from app.modules.auth import repository

INVALID_TOKEN_MESSAGE = ("El enlace de recuperación no es válido o ya expiró.")

def digest_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_password_reset(email):
    normalized_email = email.strip().lower()
    token = secrets.token_urlsafe(32)
    # Solo el resumen SHA-256 se persiste; el token original se utiliza en el enlace enviado.
    token_hash = digest_token(token)

    with transaction() as cursor:
        user = repository.lock_user_by_email(normalized_email, cursor=cursor,)

        if not user or not user["activo"]:
            return None

        repository.insert_reset_token(user["id_usuario"], token_hash, cursor=cursor,)

        recipient = user["email"]

    return {
        "email": recipient,
        "token": token,
    }

def reset_password(token, password):
    # Solo el resumen SHA-256 se persiste; el token original se utiliza en el enlace enviado.
    token_hash = digest_token(token)
    password_hash = hash_password(password)

    with transaction() as cursor:
        owner = repository.find_token_owner(token_hash, cursor=cursor,)

        if owner is None:
            raise BadRequest(INVALID_TOKEN_MESSAGE)

        user_id = owner["id_usuario"]

        user = repository.lock_user_by_id(user_id, cursor=cursor,)

        if not user or not user["activo"]:
            raise BadRequest(INVALID_TOKEN_MESSAGE)

        # El consumo condicional comprueba vigencia y uso previo antes de permitir el cambio.
        consumed = repository.consume_reset_token(user_id, token_hash, cursor=cursor,)

        if consumed is None:
            raise BadRequest(INVALID_TOKEN_MESSAGE)

        repository.update_password(user_id, password_hash, cursor=cursor,)

        repository.invalidate_pending_tokens(user_id, cursor=cursor,)