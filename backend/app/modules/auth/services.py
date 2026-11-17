# Autentica cuentas y permite modificar el perfil o la contraseña del usuario actual.
# Las respuestas públicas excluyen el hash de contraseña y la versión interna de sesión.
from marshmallow import ValidationError
from werkzeug.exceptions import Unauthorized

from app.core.db_helpers import transaction
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth import repository as auth_repo
from app.modules.users.repositories import accounts as accounts_repo
from app.modules.users.repositories.accounts import get_login_user
from app.modules.users.services.accounts import prepare_account_data, require_account, save_account

DUMMY_PASSWORD_HASH = hash_password("contrasena-simulada-para-autenticacion")

def authenticate_user(email, password):
    user = get_login_user(email.strip().lower())
    # Verifica también un hash simulado cuando no existe la cuenta para reducir diferencias de tiempo.
    stored_hash = user["password_hash"] if user else DUMMY_PASSWORD_HASH
    valid_password = verify_password(password, stored_hash)

    if not user or not valid_password or not user["activo"]:
        return None

    public_user = dict(user)
    public_user.pop("password_hash")
    public_user.pop("session_version")

    return {
        "access_token": create_access_token(
            user["id_usuario"],
            user["session_version"],
        ),
        "user": public_user,
    }

def update_my_profile(user_id, data):
    prepared = prepare_account_data(
        data,
        {"nombre", "apellido", "email", "telefono"},
    )

    with transaction() as cursor:
        accounts = accounts_repo.lock_users([user_id], cursor=cursor)
        require_account(accounts.get(user_id), active=True)

        updated = save_account(cursor, user_id, prepared)

        public_user = dict(updated)
        public_user.pop("session_version", None)
        public_user.pop("password_hash", None)

        return public_user

def change_my_password(user_id, current_password, password):
    with transaction() as cursor:
        user = auth_repo.lock_user_credentials(user_id, cursor=cursor,)

        if not user or not user["activo"]:
            raise Unauthorized("Tu sesión ya no es válida.")

        if not verify_password(current_password, user["password_hash"],):
            raise ValidationError({"current_password": ["La contraseña actual no es correcta."]})

        if verify_password(password, user["password_hash"]):
            raise ValidationError({"password": ["La nueva contraseña debe ser diferente de la actual."]})

        auth_repo.update_password(user_id, hash_password(password), cursor=cursor,)

        auth_repo.invalidate_pending_tokens(user_id, cursor=cursor,)