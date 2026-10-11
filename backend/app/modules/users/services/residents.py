from werkzeug.exceptions import Conflict, NotFound

from app.core.db_helpers import transaction
from app.modules.users.repositories import accounts as accounts_repo
from app.modules.users.repositories import residents as residents_repo

from .accounts import update_managed_account, lock_management, create_account, require_account, save_account, prepare_account_data
from .resident_units import require_unit

def list_residents():
    return residents_repo.find_residents()

def create_resident(data, actor_id):
    account_data = dict(data)
    unit_id = account_data.pop("id_unidad")
    prepared_data = prepare_account_data(account_data)

    with transaction() as cursor:
        lock_management(cursor, actor_id)
        require_unit(cursor, unit_id)

        account = create_account(cursor, prepared_data, "RESIDENTE")

        link = residents_repo.add_resident_unit(account["id_usuario"], unit_id, cursor=cursor)

        if link is None:
            raise Conflict("El residente ya está vinculado a esa unidad")

        return residents_repo.find_residents(account["id_usuario"], cursor=cursor)

def update_resident(user_id, data, actor_id):
    changes = dict(data)
    unit_id = changes.pop("id_unidad", None)

    prepared_data = prepare_account_data(changes) if changes else {}

    with transaction() as cursor:
        lock_management(cursor, actor_id, user_id, "RESIDENTE")

        if prepared_data:
            save_account(cursor, user_id, prepared_data)

        if unit_id is not None:
            require_unit(cursor, unit_id)

            link = residents_repo.add_resident_unit(user_id, unit_id, cursor=cursor)

            if link is None:
                raise Conflict("El residente ya está vinculado a esa unidad")

        return residents_repo.find_residents(user_id, cursor=cursor)

def deactivate_resident(user_id, actor_id):
    update_managed_account(user_id, {"activo": False}, actor_id, "RESIDENTE", access_only=True)

def get_resident_profile(user_id):
    rows = residents_repo.find_residents(user_id)

    if not rows:
        raise NotFound("Perfil de residente no encontrado")

    return rows[0]

def update_resident_profile(user_id, data):
    prepared_data = prepare_account_data(data, {"nombre", "apellido", "email", "telefono"})

    with transaction() as cursor:
        accounts = accounts_repo.lock_users([user_id], cursor=cursor)

        require_account(accounts.get(user_id), "RESIDENTE", active=True)

        save_account(cursor, user_id, prepared_data)

        return residents_repo.find_residents(user_id, cursor=cursor)[0]

def get_my_units(user_id):
    with transaction() as cursor:
        require_account(
            accounts_repo.get_user(user_id, cursor=cursor),
            "RESIDENTE",
            active=True,
        )

        return residents_repo.find_resident_units(user_id, cursor=cursor)