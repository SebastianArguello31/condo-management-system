from flask import Blueprint, current_app, g, jsonify, request, send_from_directory
from werkzeug.exceptions import BadRequest

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.incidents.schemas import (
    IncidentAssignSchema,
    InterventionCreateSchema,
    IncidentCreateSchema,
    IncidentPriorityUpdateSchema,
    IncidentStatusUpdateSchema,
)
from app.modules.incidents import services

incidents_bp = Blueprint("incidents", __name__, url_prefix="/incidents")

@incidents_bp.get("/metadata")
@token_required
@role_required("RESIDENTE", "ADMIN")
def metadata():
    return jsonify(services.get_metadata(g.current_user["id_usuario"]))

@incidents_bp.get("/priorities")
@token_required
def list_priorities():
    return jsonify(services.list_priorities())

@incidents_bp.get("/statuses")
@token_required
def list_statuses():
    return jsonify(services.list_statuses())

@incidents_bp.get("/technicians")
@token_required
@role_required("ADMIN")
def list_technicians():
    return jsonify(services.list_technicians())

@incidents_bp.post("")
@token_required
@role_required("RESIDENTE")
def create():
    if request.mimetype != "multipart/form-data":
        raise BadRequest("Debes enviar el formulario con multipart/form-data")

    if set(request.files.keys()) - {"archivos"}:
        raise BadRequest("Campo de archivo inválido")

    data = IncidentCreateSchema().load(request.form.to_dict())

    result = services.create_incident(
        data,
        request.files.getlist("archivos"),
        g.current_user["id_usuario"],
    )

    return jsonify(result), 201

@incidents_bp.get("")
@token_required
@role_required("ADMIN", "RESIDENTE", "TECNICO")
def list_all():
    return jsonify(services.list_incidents(g.current_user))

@incidents_bp.get("/<int:incident_id>")
@token_required
@role_required("ADMIN", "RESIDENTE", "TECNICO")
def detail(incident_id):
    return jsonify(services.get_incident(incident_id, g.current_user))

@incidents_bp.patch("/<int:incident_id>/priority")
@token_required
@role_required("ADMIN")
def update_priority(incident_id):
    data = read_json(IncidentPriorityUpdateSchema())
    return jsonify(services.update_priority(incident_id, data, g.current_user))

@incidents_bp.post("/<int:incident_id>/assignments")
@token_required
@role_required("ADMIN")
def assign_technician(incident_id):
    data = read_json(IncidentAssignSchema())
    return jsonify(services.assign_technician(incident_id, data, g.current_user))

@incidents_bp.patch("/<int:incident_id>/status")
@token_required
@role_required("ADMIN", "TECNICO", "RESIDENTE")
def update_status(incident_id):
    data = read_json(IncidentStatusUpdateSchema())
    return jsonify(services.update_status(incident_id, data, g.current_user))

@incidents_bp.get("/<int:incident_id>/history")
@token_required
@role_required("ADMIN", "RESIDENTE", "TECNICO")
def incident_history(incident_id):
    return jsonify(services.get_incident_history(incident_id, g.current_user))

@incidents_bp.get("/<int:incident_id>/assignments")
@token_required
@role_required("ADMIN", "TECNICO")
def incident_assignments(incident_id):
    return jsonify(services.get_incident_assignments(incident_id, g.current_user))

@incidents_bp.get("/attachments/<int:attachment_id>")
@token_required
@role_required("ADMIN", "RESIDENTE", "TECNICO")
def download(attachment_id):
    attachment = services.get_attachment(
        attachment_id,
        g.current_user,
    )

    response = send_from_directory(
        current_app.config["INCIDENT_UPLOAD_DIR"],
        attachment["url_archivo"],
        as_attachment=True,
        download_name=attachment["nombre_original"] or "adjunto",
        mimetype="application/octet-stream",
        conditional=False,
    )

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"

    return response

@incidents_bp.get("/<int:incident_id>/interventions")
@token_required
@role_required("ADMIN", "TECNICO", "RESIDENTE")
def list_interventions(incident_id):
    return jsonify(services.list_interventions(incident_id, g.current_user))

@incidents_bp.post("/<int:incident_id>/interventions")
@token_required
@role_required("ADMIN", "TECNICO")
def create_intervention(incident_id):
    data = read_json(InterventionCreateSchema())
    return jsonify(services.create_intervention(incident_id, data, g.current_user)), 201
