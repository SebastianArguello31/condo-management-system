from werkzeug.exceptions import BadRequest, Forbidden, NotFound

from app.core.db_helpers import transaction
from app.modules.incidents import attachments
from app.modules.incidents.repositories import catalogs
from app.modules.incidents.repositories import incidents as incident_repo
from app.modules.incidents.repositories import attachments as attachments_repo
from app.modules.incidents.repositories import activity as activity_repo
from app.modules.incidents.rules import require_role, get_allowed_statuses, validate_access, validate_transition
from app.modules.incidents.rules import can_register_intervention

def list_priorities():
    return catalogs.list_priorities()

def list_statuses():
    return catalogs.list_statuses()

def list_technicians():
    return catalogs.list_technicians()

def get_metadata(user_id):
    with transaction() as cursor:
        return {
            "tipos": catalogs.list_types(cursor=cursor),
            "unidades": catalogs.list_resident_units(user_id, cursor=cursor),
        }

def _get_context(incident_id, user, *, for_update=False, cursor):
    existing = incident_repo.lock_incident(incident_id, for_update=for_update, cursor=cursor)

    if existing is None:
        raise NotFound("Incidencia no encontrada")

    incident = incident_repo.get_context(incident_id, cursor=cursor)

    validate_access(incident, user)

    return incident


def get_incident_context(incident_id, user, *, for_update=False, cursor):
    """Obtiene una incidencia y valida que el usuario pueda acceder a ella."""
    return _get_context(incident_id, user, for_update=for_update, cursor=cursor)

def _get_detail(incident_id, user, *, cursor):
    incident = incident_repo.get_incident(incident_id, cursor=cursor)

    if incident is None:
        raise NotFound("Incidencia no encontrada")

    incident["estados_permitidos"] = get_allowed_statuses(incident, user)
    incident["puede_registrar_intervencion"] = can_register_intervention(incident, user)

    incident["adjuntos"] = attachments_repo.list_attachments(incident_id, cursor=cursor)

    return incident

def list_incidents(user):
    require_role(user, "ADMIN", "RESIDENTE", "TECNICO")

    if user["rol"] == "RESIDENTE":
        return incident_repo.list_incidents(reporter_id=user["id_usuario"],)

    if user["rol"] == "TECNICO":
        return incident_repo.list_incidents(technician_id=user["id_usuario"],)

    return incident_repo.list_incidents()

def get_incident(incident_id, user):
    with transaction() as cursor:
        _get_context(incident_id, user, cursor=cursor)
        return _get_detail(incident_id, user, cursor=cursor)

def get_history(incident_id, user):
    with transaction() as cursor:
        _get_context(incident_id, user, cursor=cursor)
        return activity_repo.list_history(incident_id, cursor=cursor)

def get_assignments(incident_id, user):
    require_role(user, "ADMIN", "TECNICO")

    with transaction() as cursor:
        _get_context(incident_id, user, cursor=cursor)
        return activity_repo.list_assignments(incident_id, cursor=cursor)

def create_incident(data, files, user):
    require_role(user, "RESIDENTE")

    prepared_files = attachments.prepare_files(files)
    created_paths = []

    try:
        with transaction() as cursor:
            link = incident_repo.get_resident_link(
                user["id_usuario"],
                data["id_unidad"],
                cursor=cursor,
            )

            if link is None:
                raise Forbidden("La unidad no está asociada a tu usuario")

            incident_type = catalogs.get_active_type(data["id_tipo_incidencia"], cursor=cursor)

            if incident_type is None:
                raise BadRequest("El tipo de incidencia no está disponible")

            priority = catalogs.get_priority(cursor=cursor)
            status = catalogs.get_status(name="RECIBIDA", cursor=cursor)

            if priority is None or status is None:
                raise BadRequest("Falta configurar la prioridad Normal o el estado RECIBIDA")

            incident = incident_repo.insert_incident(
                data,
                user["id_usuario"],
                priority,
                cursor=cursor,
            )
            incident_id = incident["id_incidencia"]

            activity_repo.record_status(
                incident_id,
                status["id_estados_incidencia"],
                user["id_usuario"],
                cursor=cursor,
            )

            for file in prepared_files:
                attachments.save_file(file, created_paths)
                attachments_repo.insert_attachment(
                    incident_id,
                    user["id_usuario"],
                    file,
                    cursor=cursor,
                )

        return {
            "id_incidencia": incident_id,
            "estado": "RECIBIDA",
        }

    except Exception:
        attachments.cleanup_files(created_paths)
        raise

def assign_technician(incident_id, data, user):
    require_role(user, "ADMIN")

    with transaction() as cursor:
        incident = _get_context(incident_id, user, for_update=True, cursor=cursor)

        if incident["estado"] is None:
            raise BadRequest("La incidencia no tiene un estado registrado")

        if incident["estado"] in {"RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA",}:
            raise BadRequest("La incidencia debe estar abierta para asignar un técnico")

        technician = catalogs.get_staff(data["id_personal_asignado"], cursor=cursor)

        if technician is None:
            raise NotFound("El técnico indicado no existe")

        if technician["rol"] != "TECNICO":
            raise BadRequest("El usuario asignado debe tener el rol TECNICO")

        if not technician["activo"]:
            raise BadRequest("No se puede asignar un técnico desactivado")

        assigned_status = None

        if incident["estado"] in {"RECIBIDA", "EN_REVISION"}:
            assigned_status = catalogs.get_status(name="ASIGNADA", cursor=cursor)

            if assigned_status is None:
                raise BadRequest("Falta configurar el estado ASIGNADA")

        activity_repo.replace_assignment(
            incident_id,
            technician["id_usuario"],
            data.get("notas"),
            cursor=cursor,
        )

        if assigned_status is not None:
            activity_repo.record_status(
                incident_id,
                assigned_status["id_estados_incidencia"],
                user["id_usuario"],
                cursor=cursor,
            )

        incident_repo.touch_incident(incident_id, cursor=cursor)

        return _get_detail(incident_id, user, cursor=cursor)

def update_priority(incident_id, data, user):
    require_role(user, "ADMIN")

    with transaction() as cursor:
        _get_context(incident_id, user, for_update=True, cursor=cursor)

        priority = catalogs.get_priority(data["id_prioridad"], cursor=cursor)

        if priority is None:
            raise BadRequest("La prioridad no está disponible")

        incident_repo.update_priority(incident_id, priority, cursor=cursor)

        return _get_detail(incident_id, user, cursor=cursor)

def update_status(incident_id, data, user):
    with transaction() as cursor:
        incident = _get_context(incident_id, user, for_update=True, cursor=cursor)

        if incident["estado"] is None:
            raise BadRequest("La incidencia no tiene un estado registrado")

        status = catalogs.get_status(
            status_id=data.get("id_estado"),
            name=data.get("estado"),
            cursor=cursor,
        )

        if status is None:
            raise BadRequest("Debes indicar un estado válido existente")

        new_status = status["nombre"].upper()
        validate_transition(incident, new_status, user)

        incident_repo.update_resolution_date(
            incident_id,
            incident["estado"],
            new_status,
            cursor=cursor,
        )

        activity_repo.record_status(
            incident_id,
            status["id_estados_incidencia"],
            user["id_usuario"],
            data.get("comentario"),
            cursor=cursor,
        )

        return _get_detail(incident_id, user, cursor=cursor)

def get_attachment(attachment_id, user):
    with transaction() as cursor:
        file = attachments_repo.get_attachment(attachment_id, cursor=cursor)

        if file is None:
            raise NotFound("Adjunto no encontrado")

        _get_context(file["incidencias_id_incidencia"], user, cursor=cursor)

        return file

def list_interventions(incident_id, user):
    with transaction() as cursor:
        _get_context(incident_id, user, cursor=cursor)
        return activity_repo.list_interventions(incident_id, cursor=cursor)

def create_intervention(incident_id, data, user):
    require_role(user, "ADMIN", "TECNICO")

    with transaction() as cursor:
        incident = _get_context(incident_id, user, for_update=True, cursor=cursor)

        if incident["id_personal_asignado"] is None:
            raise BadRequest("La incidencia debe tener un técnico asignado")

        if not can_register_intervention(incident, user):
            raise BadRequest("Solo puedes intervenir una incidencia asignada o en atención")

        intervention = activity_repo.insert_intervention(
            incident_id,
            user["id_usuario"],
            data["resultado"],
            cursor=cursor,
        )

        incident_repo.touch_incident(incident_id, cursor=cursor)

        return intervention
