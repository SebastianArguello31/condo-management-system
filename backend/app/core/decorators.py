from functools import wraps

import jwt
from flask import g, request
from werkzeug.exceptions import Forbidden, Unauthorized

from app.core.db_helpers import query
from app.core.security import decode_access_token

def token_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        parts = request.headers.get("Authorization", "").split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise Unauthorized("Token requerido")

        try:
            payload = decode_access_token(parts[1])
            user_id = int(payload["sub"])

            if user_id <= 0:
                raise ValueError()

        except jwt.ExpiredSignatureError:
            raise Unauthorized("La sesión expiró") from None

        except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
            raise Unauthorized("Token inválido") from None

        user = query("""
            SELECT u.id_usuario, u.nombre, u.apellido,
                   u.email, u.telefono, u.activo, u.id_rol,
                   r.nombre AS rol
            FROM usuarios u
            JOIN roles r ON r.id_rol = u.id_rol
            WHERE u.id_usuario = %s;
        """, (user_id,))

        if not user or not user["activo"]:
            raise Unauthorized("Usuario inexistente o desactivado")

        g.current_user = user

        return function(*args, **kwargs)

    return wrapper

def role_required(*allowed_roles):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            if g.current_user["rol"] not in allowed_roles:
                raise Forbidden("No tienes permisos para esta acción")

            return function(*args, **kwargs)

        return wrapper

    return decorator
