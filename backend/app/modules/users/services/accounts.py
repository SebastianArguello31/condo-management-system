from psycopg2.errors import ForeignKeyViolation
from werkzeug.exceptions import BadRequest, Conflict, Forbidden, NotFound

from app.core.db_helpers import transaction
from app.modules.users.repositories import accounts as accounts_repo
from app.core.security import hash_password

def prepare_account_data(data, allowed_fields=None):
    if allowed_fields is None:
        allowed_fields = {"nombre", "apellido", "email", "telefono", "password", "activo"}

    if not data or not set(data).issubset(allowed_fields):
        raise BadRequest("Campos de actualización inválidos")

    prepared_data = dict(data)

    if "email" in prepared_data:
        prepared_data["email"] = prepared_data["email"].strip().lower()

    if "password" in prepared_data:
        prepared_data["password_hash"] = hash_password(prepared_data.pop("password"))

    return prepared_data

def require_account(account, role=None, *, active=False):
    if account is None:
        raise NotFound("Cuenta no encontrada")

    if role is not None and account["rol"] != role:
        raise NotFound("Cuenta no encontrada en este flujo")

    if active and not account["activo"]:
        raise Forbidden("Tu cuenta está desactivada")

    return account

def lock_management(cursor, actor_id, user_id=None, role=None):
    ids = [actor_id]

    if user_id is not None:
        ids.append(user_id)

    accounts = accounts_repo.lock_users(ids, cursor=cursor)

    actor = accounts.get(actor_id)

    if not actor or not actor["activo"] or actor["rol"] != "ADMIN":
        raise Forbidden("Tu cuenta ya no tiene permisos de administración")

    if user_id is None:
        return actor

    return require_account(accounts.get(user_id), role)

def list_accounts(role=None):
    return accounts_repo.list_users(role)

def get_account(user_id):
    return require_account(accounts_repo.get_user(user_id))

def list_roles():
    return accounts_repo.get_roles()

def create_account(cursor, prepared_data, role_name):
    role = accounts_repo.find_role(role_name, cursor=cursor)

    if role is None:
        raise BadRequest("El rol requerido no está configurado")

    return accounts_repo.insert_user(prepared_data, role["id_rol"], cursor=cursor)

def save_account(cursor, user_id, prepared_data):
    return require_account(accounts_repo.update_user(user_id, prepared_data, cursor=cursor))

def update_managed_account(user_id, data, actor_id, role=None, *, access_only=False):
    prepared_data = prepare_account_data(data, {"activo"} if access_only else None)

    with transaction() as cursor:
        lock_management(cursor, actor_id, user_id, role)

        if user_id == actor_id and prepared_data.get("activo") is False:
            raise BadRequest("No puedes desactivar tu propia cuenta")

        return save_account(cursor, user_id, prepared_data)

def delete_account(user_id, actor_id, role=None):
    try:
        with transaction() as cursor:
            lock_management(cursor, actor_id, user_id, role)

            if user_id == actor_id:
                raise BadRequest("No puedes eliminar tu propia cuenta")

            accounts_repo.delete_user(user_id, cursor=cursor)

    except ForeignKeyViolation:
        raise Conflict(
            "La cuenta tiene registros relacionados. "
            "Puedes desactivarla para impedir su acceso."
        ) from None