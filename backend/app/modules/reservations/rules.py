from datetime import datetime, timedelta

from werkzeug.exceptions import Conflict, Forbidden


STATUS_TRANSITIONS = {
    "PENDIENTE": {"CONFIRMADA", "RECHAZADA", "CANCELADA"},
    "CONFIRMADA": {"CANCELADA"},
}


def require_role(user, *roles):
    if user.get("rol") not in roles:
        raise Forbidden("No tienes permiso para realizar esta operación")


def get_user_filter(user, resident_id=None):
    require_role(user, "ADMIN", "RESIDENTE")

    if user["rol"] == "ADMIN":
        return resident_id

    return user["id_usuario"]


def validate_access(reservation, user):
    require_role(user, "ADMIN", "RESIDENTE")

    if (user["rol"] != "ADMIN" and reservation["id_usuario"] != user["id_usuario"]):
        raise Forbidden("No tienes acceso a esta reserva")


def is_transition_allowed(current_status, new_status):
    return new_status in STATUS_TRANSITIONS.get(current_status, set())


def validate_status_change(reservation, new_status, user, now):
    validate_access(reservation, user)

    if user["rol"] != "ADMIN" and new_status != "CANCELADA":
        raise Forbidden("Solo administradores pueden aprobar o rechazar reservas")

    if not is_transition_allowed(reservation["estado"], new_status):
        raise Conflict(f"No se permite cambiar de {reservation['estado']} " f"a {new_status}")

    if new_status == "CANCELADA":
        end_at = datetime.combine(reservation["fecha"], reservation["hora_fin"])
        current_time = datetime.combine(now["hoy"], now["hora_actual"])

        if end_at <= current_time:
            raise Conflict("No se puede cancelar una reserva pasada")


def validate_creation(data, space, policy, now):
    if not space["activo"]:
        raise Conflict("El espacio común no está activo")

    if data["fecha"] < now["hoy"]:
        raise Conflict("La fecha no puede ser anterior a hoy")

    if (data["fecha"] == now["hoy"] and data["hora_inicio"] <= now["hora_actual"]):
        raise Conflict("Para reservar hoy, la hora de inicio debe ser futura")

    if data["hora_fin"] <= data["hora_inicio"]:
        raise Conflict("La hora de fin debe ser posterior a la hora de inicio")

    if (
        data["hora_inicio"] < policy["hora_apertura"]
        or data["hora_fin"] > policy["hora_cierre"]
    ):
        raise Conflict(
            "El horario debe estar entre "
            f"{policy['hora_apertura'].strftime('%H:%M')} y "
            f"{policy['hora_cierre'].strftime('%H:%M')}"
        )

    duration = (
        datetime.combine(data["fecha"], data["hora_fin"])
        - datetime.combine(data["fecha"], data["hora_inicio"])
    )

    if duration > timedelta(hours=policy["duracion_max_horas"]):
        raise Conflict(
            "La duración supera el máximo de "
            f"{policy['duracion_max_horas']} horas"
        )

    advance_days = (data["fecha"] - now["hoy"]).days

    if not (policy["dias_anticipacion_min"] <= advance_days <= policy["dias_anticipacion_max"]):
        raise Conflict(
            "La fecha debe tener entre "
            f"{policy['dias_anticipacion_min']} y "
            f"{policy['dias_anticipacion_max']} días de anticipación"
        )

    capacity = min(space["capacidad"], policy["aforo_maximo"])

    if data["cantidad_personas"] > capacity:
        raise Conflict(f"La cantidad de personas supera el aforo máximo de {capacity}")
