import bcrypt

from app.core.db_helpers import query
from app.core.security import check_password, create_access_token

DUMMY_HASH = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt(),).decode("utf-8")

def authenticate_user(email, password):
    user = query("""
        SELECT u.id_usuario, u.nombre, u.apellido,
               u.email, u.telefono, u.password_hash,
               u.activo, u.id_rol, r.nombre AS rol
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.email = %s;
    """, (email,))

    stored_hash = user["password_hash"] if user else DUMMY_HASH
    valid_password = check_password(password, stored_hash)

    if not user or not valid_password or not user["activo"]:
        return None

    user.pop("password_hash")

    return {
        "access_token": create_access_token(user["id_usuario"]),
        "user": user,
    }