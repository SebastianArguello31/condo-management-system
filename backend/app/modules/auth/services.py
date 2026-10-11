from app.core.security import create_access_token, hash_password, verify_password
from app.modules.users.repositories.accounts import get_login_user

DUMMY_PASSWORD_HASH = hash_password("contrasena-simulada-para-autenticacion")

def authenticate_user(email, password):
    user = get_login_user(email.strip().lower())
    stored_hash = user["password_hash"] if user else DUMMY_PASSWORD_HASH
    valid_password = verify_password(password, stored_hash)

    if not user or not valid_password or not user["activo"]:
        return None

    public_user = dict(user)
    public_user.pop("password_hash")

    return {
        "access_token": create_access_token(user["id_usuario"]),
        "user": public_user,
    }