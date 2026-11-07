from psycopg2.errors import ForeignKeyViolation
from werkzeug.exceptions import BadRequest, Conflict, NotFound

from app.core.db_helpers import transaction
from app.modules.users.repositories import accounts as accounts_repo
from app.modules.users.repositories import specialties as specialties_repo

from .accounts import lock_management, require_account

def list_specialties():
    return specialties_repo.find_specialties()

def create_specialty(data, actor_id):
    with transaction() as cursor:
        lock_management(cursor, actor_id)

        return specialties_repo.insert_specialty(data, cursor=cursor)

def update_specialty(specialty_id, data, actor_id):
    with transaction() as cursor:
        lock_management(cursor, actor_id)

        specialty = specialties_repo.update_specialty(specialty_id, data, cursor=cursor)

        if specialty is None:
            raise NotFound("Especialidad no encontrada")

        return specialty

def delete_specialty(specialty_id, actor_id):
    try:
        with transaction() as cursor:
            lock_management(cursor, actor_id)

            deleted = specialties_repo.delete_specialty(specialty_id, cursor=cursor)

            if deleted is None:
                raise NotFound("Especialidad no encontrada")

    except ForeignKeyViolation:
        raise Conflict(
            "La especialidad tiene registros relacionados. "
            "Puedes desactivarla para impedir nuevas asignaciones."
        ) from None

def replace_specialties(cursor, user_id, ids):
    selected_ids = sorted(set(ids))

    if not selected_ids:
        raise BadRequest("Selecciona al menos una especialidad laboral")

    previous_ids = {
        row["id_especialidad"]
        for row in specialties_repo.find_specialties(user_id, cursor=cursor)
    }

    specialties = specialties_repo.lock_specialties(selected_ids, cursor=cursor)

    if len(specialties) != len(selected_ids):
        raise BadRequest("Una especialidad seleccionada ya no existe")

    for specialty in specialties:
        is_new = specialty["id_especialidad"] not in previous_ids
        if is_new and not specialty["activo"]:
            raise BadRequest("No puedes asignar una especialidad inactiva")

    specialties_repo.replace_user_specialties(user_id, selected_ids, cursor=cursor)

def list_employee_specialties(user_id):
    with transaction() as cursor:
        require_account(accounts_repo.get_user(user_id, cursor=cursor), "TECNICO")

        return specialties_repo.find_specialties(user_id, cursor=cursor)

def link_specialty(user_id, specialty_id, actor_id):
    with transaction() as cursor:
        employee = lock_management(cursor, actor_id, user_id, "TECNICO")

        if not employee["activo"]:
            raise BadRequest("Debes activar al empleado antes de asignar especialidades")

        specialties = specialties_repo.lock_specialties([specialty_id], cursor=cursor)

        if not specialties:
            raise NotFound("Especialidad no encontrada")

        if not specialties[0]["activo"]:
            raise BadRequest("No puedes asignar una especialidad inactiva")

        specialties_repo.add_user_specialty(user_id, specialty_id, cursor=cursor)

    return {
        "message": "Especialidad vinculada correctamente",
    }

def unlink_specialty(user_id, specialty_id, actor_id):
    with transaction() as cursor:
        lock_management(cursor, actor_id, user_id, "TECNICO")

        assigned_ids = {
            row["id_especialidad"]
            for row in specialties_repo.find_specialties(user_id, cursor=cursor)
        }

        if specialty_id not in assigned_ids:
            raise NotFound("El empleado no tiene esa especialidad")

        if len(assigned_ids) == 1:
            raise BadRequest("El empleado debe conservar al menos una especialidad")

        specialties_repo.remove_user_specialty(user_id, specialty_id, cursor=cursor)