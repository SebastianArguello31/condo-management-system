from flask import Blueprint, current_app, g, jsonify, request, send_from_directory

from werkzeug.exceptions import BadRequest

from app.core.decorators import role_required, token_required
from app.modules.incidents.schemas import IncidentCreateSchema
from app.modules.incidents import services

incidents_bp = Blueprint("incidents", __name__, url_prefix="/condominio/incidents")

@incidents_bp.get("/metadata")
@token_required
@role_required("RESIDENTE")
def metadata():
    return jsonify(services.get_metadata(g.current_user["id_usuario"]))

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
@role_required("ADMIN", "RESIDENTE")
def list_all():
    return jsonify(services.list_incidents(g.current_user))

@incidents_bp.get("/<int:incident_id>")
@token_required
@role_required("ADMIN", "RESIDENTE")
def detail(incident_id):
    return jsonify(services.get_incident(incident_id, g.current_user))

@incidents_bp.get("/attachments/<int:attachment_id>")
@token_required
@role_required("ADMIN", "RESIDENTE")
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
