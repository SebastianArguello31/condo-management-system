from app.modules.reservations.repositories import context as context_repo
from werkzeug.exceptions import BadRequest, Conflict, Forbidden, NotFound

from app.core.db_helpers import transaction
from app.modules.reservations.repositories import (reservations as reservation_repo)
from app.modules.reservations.rules import (
    require_role,
    get_user_filter,
    validate_access,
    validate_status_change,
    validate_creation,
)


def list_event_types():
    return context_repo.list_event_types()


def list_reservations(user, space=None, status=None, reservation_date=None, resident_id=None):
    user_id = get_user_filter(user, resident_id)

    with transaction() as cursor:
        if status is not None:
            existing_status = context_repo.get_status(status, cursor=cursor)

            if existing_status is None:
                raise BadRequest("El estado indicado no existe")

        return reservation_repo.list_reservations(
            user_id=user_id,
            space=space,
            status=status,
            reservation_date=reservation_date,
            cursor=cursor,
        )


def get_reservation(reservation_id, user):
    require_role(user, "ADMIN", "RESIDENTE")

    reservation = reservation_repo.get_reservation(reservation_id)

    if reservation is None:
        raise NotFound("Reserva no encontrada")

    validate_access(reservation, user)

    return reservation


def create_reservation(data, user):
    require_role(user, "RESIDENTE")

    with transaction() as cursor:
        space = context_repo.lock_space(data["id_espacio"], cursor=cursor)

        if space is None:
            raise NotFound("Espacio no encontrado")

        if not space["activo"]:
            raise Conflict("El espacio común no está activo")

        link = context_repo.get_resident_link(user["id_usuario"], cursor=cursor)

        if link is None:
            raise Forbidden("Tu usuario no tiene una unidad vinculada")

        event_type = context_repo.get_active_event_type(data["id_tipo_evento"], cursor=cursor)

        if event_type is None:
            raise Conflict("El tipo de evento no está disponible")

        policy = context_repo.get_policy(
            data["id_espacio"],
            data["id_tipo_evento"],
            cursor=cursor,
        )

        if policy is None:
            raise Conflict("Sin política configurada para este espacio " "y tipo de evento")

        status = context_repo.get_status("PENDIENTE", cursor=cursor)

        if status is None:
            raise Conflict("Falta configurar el estado PENDIENTE")

        now = context_repo.get_current_time(cursor=cursor)
        validate_creation(data, space, policy, now)

        if reservation_repo.has_overlap(data, cursor=cursor):
            raise Conflict("Ya existe una reserva activa en ese horario")

        result = reservation_repo.insert_reservation(
            data,
            user["id_usuario"],
            policy["costo"],
            status["id_estado_reserva"],
            cursor=cursor,
        )

        return reservation_repo.get_reservation(result["id_reserva"], cursor=cursor)


def update_reservation_status(reservation_id, new_status, user):
    require_role(user, "ADMIN", "RESIDENTE")

    # Mantener el orden de bloqueo: primero el espacio, después la reserva.
    with transaction() as cursor:
        location = reservation_repo.get_reservation_location(reservation_id, cursor=cursor)

        if location is None:
            raise NotFound("Reserva no encontrada")

        space = context_repo.lock_space(location["id_espacio_comun"], cursor=cursor)

        if space is None:
            raise NotFound("Espacio no encontrado")

        locked_reservation = reservation_repo.lock_reservation(reservation_id, cursor=cursor)

        if locked_reservation is None:
            raise NotFound("Reserva no encontrada")

        reservation = reservation_repo.get_reservation_context(reservation_id, cursor=cursor)

        if reservation is None:
            raise NotFound("Reserva no encontrada")

        validate_access(reservation, user)

        if (reservation["id_espacio_comun"] != location["id_espacio_comun"]):
            raise Conflict("La reserva cambió de espacio. Reintenta la operación.")

        status = context_repo.get_status(new_status, cursor=cursor)

        if status is None:
            raise Conflict(f"Falta configurar el estado {new_status}")

        now = context_repo.get_current_time(cursor=cursor)

        validate_status_change(reservation, new_status, user, now)

        reservation_repo.update_status(
            reservation_id,
            status["id_estado_reserva"],
            cursor=cursor,
        )

        return reservation_repo.get_reservation(reservation_id, cursor=cursor)
