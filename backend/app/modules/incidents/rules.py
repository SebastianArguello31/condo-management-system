from werkzeug.exceptions import BadRequest, Forbidden

ALLOWED_TRANSITIONS = {
    "RECIBIDA": {"EN_REVISION", "ASIGNADA", "RECHAZADA", "CANCELADA"},
    "EN_REVISION": {"ASIGNADA", "EN_PROCESO", "RECHAZADA", "CANCELADA"},
    "ASIGNADA": {"EN_PROCESO", "EN_ESPERA", "CANCELADA"},
    "EN_PROCESO": {"EN_ESPERA", "RESUELTA", "CANCELADA"},
    "EN_ESPERA": {"EN_PROCESO", "RESUELTA", "CANCELADA"},
    "RESUELTA": {"CERRADA", "EN_PROCESO"},
    "CERRADA": {"EN_PROCESO"},
    "RECHAZADA": {"RECIBIDA"},
    "CANCELADA": set(),
}

TECHNICIAN_STATUSES = {"EN_PROCESO", "EN_ESPERA", "RESUELTA", "CERRADA",}

ASSIGNMENT_REQUIRED_STATUSES = {"ASIGNADA", "EN_PROCESO", "EN_ESPERA", "RESUELTA", "CERRADA",}

INTERVENTION_STATUSES = {"ASIGNADA", "EN_PROCESO", "EN_ESPERA"}

def can_register_intervention(incident, user):
    validate_access(incident, user)
    return (
        user["rol"] in {"ADMIN", "TECNICO"}
        and incident["id_personal_asignado"] is not None
        and incident["estado"] in INTERVENTION_STATUSES
    )

def require_role(user, *roles):
    if user.get("rol") not in roles:
        raise Forbidden("No tienes permiso para realizar esta operación")

def validate_access(incident, user):
    require_role(user, "ADMIN", "RESIDENTE", "TECNICO")

    if user["rol"] == "RESIDENTE" and incident["id_reportante"] != user["id_usuario"]:
        raise Forbidden("No tienes acceso a esta incidencia")

    if user["rol"] == "TECNICO" and incident["id_personal_asignado"] != user["id_usuario"]:
        raise Forbidden("La incidencia no está asignada a tu usuario")

def get_allowed_statuses(incident, user):
    validate_access(incident, user)

    current_status = incident["estado"]
    allowed_statuses = set(ALLOWED_TRANSITIONS.get(current_status, set()))

    if user["rol"] == "TECNICO":
        allowed_statuses &= TECHNICIAN_STATUSES

    elif user["rol"] == "RESIDENTE":
        allowed_statuses &= {"CANCELADA"}
        if current_status not in {"RECIBIDA", "EN_REVISION"}:
            allowed_statuses.clear()

    if incident["id_personal_asignado"] is None:
        allowed_statuses -= ASSIGNMENT_REQUIRED_STATUSES

    return sorted(allowed_statuses)

def validate_transition(incident, new_status, user):
    validate_access(incident, user)

    if user["rol"] == "TECNICO" and new_status not in TECHNICIAN_STATUSES:
        raise Forbidden("Los técnicos no pueden establecer ese estado")

    if user["rol"] == "RESIDENTE" and new_status != "CANCELADA":
        raise Forbidden("Los residentes solo pueden cancelar sus solicitudes")

    if new_status == incident["estado"]:
        raise BadRequest("La incidencia ya se encuentra en ese estado")

    if new_status not in get_allowed_statuses(incident, user):
        raise BadRequest("El cambio de estado no está permitido para la situación actual de la incidencia")
