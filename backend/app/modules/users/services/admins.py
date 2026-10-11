from werkzeug.exceptions import BadRequest
from app.modules.users.repositories import accounts as accounts_repo
from app.modules.users.schemas.accounts import UserCreateSchema
from app.core.db_helpers import transaction

from .accounts import update_managed_account, lock_management, create_account, list_accounts, prepare_account_data

def list_admins():
    return list_accounts("ADMIN")

def create_admin(data, actor_id):
    prepared_data = prepare_account_data(data)

    with transaction() as cursor:
        lock_management(cursor, actor_id)

        return create_account(cursor, prepared_data, "ADMIN")

def update_admin(user_id, data, actor_id):
    return update_managed_account(user_id, data, actor_id, "ADMIN")

def create_user(**data):
    data = UserCreateSchema().load(data)
    role_id = data.pop("id_rol")
    prepared_data = prepare_account_data(data)

    with transaction() as cursor:
        role = accounts_repo.find_role("ADMIN", cursor=cursor)
        if role is None or role["id_rol"] != role_id:
            raise BadRequest("Este script solo permite crear administradores")
        return create_account(cursor, prepared_data, "ADMIN")