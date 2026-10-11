from werkzeug.exceptions import BadRequest, NotFound

from app.core.db_helpers import transaction
from app.modules.users.repositories import accounts as accounts_repo
from app.modules.users.repositories import residents as residents_repo

from .accounts import lock_management, require_account

def require_unit(cursor, unit_id):
    unit = residents_repo.get_unit_for_link(unit_id, cursor=cursor)

    if unit is None:
        raise NotFound("Unidad no encontrada")

    return unit

def list_resident_units(user_id):
    with transaction() as cursor:
        require_account(accounts_repo.get_user(user_id, cursor=cursor), "RESIDENTE")

        return residents_repo.find_resident_units(user_id, cursor=cursor)

def link_unit(user_id, unit_id, actor_id):
    with transaction() as cursor:
        resident = lock_management(cursor, actor_id, user_id, "RESIDENTE")

        if not resident["activo"]:
            raise BadRequest("Debes activar al residente antes de vincularlo")

        require_unit(cursor, unit_id)

        residents_repo.add_resident_unit(user_id, unit_id, cursor=cursor)

    return {
        "message": "Unidad vinculada correctamente",
    }

def unlink_unit(user_id, unit_id, actor_id):
    with transaction() as cursor:
        lock_management(cursor, actor_id, user_id, "RESIDENTE")

        deleted = residents_repo.remove_resident_unit(user_id, unit_id, cursor=cursor)

        if deleted is None:
            raise NotFound("El vínculo no existe")