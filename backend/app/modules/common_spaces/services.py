from werkzeug.exceptions import BadRequest, Conflict, NotFound

from app.core.db_helpers import transaction
from app.modules.common_spaces.repositories import availability as availability_repo
from app.modules.common_spaces.repositories import policies as policies_repo
from app.modules.common_spaces.repositories import spaces as spaces_repo

def list_spaces(role):
    return spaces_repo.list_spaces(include_inactive=role == "ADMIN")

def get_space(space_id, *, cursor=None):
    space = spaces_repo.get_space(space_id, cursor=cursor)

    if space is None:
        raise NotFound("Espacio no encontrado")

    return space

def _lock_space(space_id, *, cursor):
    space = spaces_repo.lock_space(space_id, cursor=cursor)

    if space is None:
        raise NotFound("Espacio no encontrado")

    return space

def create_space(data):
    with transaction() as cursor:
        result = spaces_repo.insert_space(data, cursor=cursor)

        return get_space(result["id_espacio_comun"], cursor=cursor)

def update_space(space_id, data):
    with transaction() as cursor:
        _lock_space(space_id, cursor=cursor)

        if "capacidad" in data:
            max_policy_capacity = policies_repo.get_max_policy_capacity(space_id, cursor=cursor)

            if data["capacidad"] < max_policy_capacity:
                raise Conflict("La capacidad no puede ser menor que el aforo de las políticas existentes. Ajusta primero esas políticas.")

        return spaces_repo.update_space(space_id, data, cursor=cursor)

def get_availability(space_id, start_date, end_date, event_type_id=None):
    if end_date < start_date:
        raise BadRequest("La fecha fin no puede ser anterior a la fecha inicio")

    if (end_date - start_date).days > 31:
        raise BadRequest("El rango de fechas no puede superar 31 días")

    with transaction() as cursor:
        space = get_space(space_id, cursor=cursor)

        if not space["activo"]:
            raise Conflict("El espacio común no está activo")

        policies = policies_repo.list_policies(space_id, event_type_id, cursor=cursor)

        if event_type_id is not None and not policies:
            raise Conflict("Sin política configurada para este espacio " "y tipo de evento")

        occupied_slots = availability_repo.list_occupied_slots(space_id, start_date, end_date, cursor=cursor,)

        return {
            "espacio": space,
            "fecha_inicio": start_date.isoformat(),
            "fecha_fin": end_date.isoformat(),
            "politicas": policies,
            "tramos_ocupados": occupied_slots,
        }

def list_policies(space_id):
    with transaction() as cursor:
        get_space(space_id, cursor=cursor)

        return policies_repo.list_policies(space_id, cursor=cursor)

def save_policy(space_id, data, policy_id=None):
    with transaction() as cursor:
        space = _lock_space(space_id, cursor=cursor)

        if data["aforo_maximo"] > space["capacidad"]:
            raise BadRequest("El aforo de la política supera la capacidad del espacio")

        event_type = policies_repo.get_active_event_type(data["id_tipo_evento"], cursor=cursor)

        if event_type is None:
            raise BadRequest("Tipo de evento no disponible")

        result = policies_repo.save_policy(space_id, data, policy_id, cursor=cursor)

        if result is None:
            raise NotFound("Política no encontrada")

        return result

def delete_policy(space_id, policy_id):
    with transaction() as cursor:
        _lock_space(space_id, cursor=cursor)

        result = policies_repo.delete_policy(space_id, policy_id, cursor=cursor)

        if result is None:
            raise NotFound("Política no encontrada")