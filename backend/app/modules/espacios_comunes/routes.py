from flask import Blueprint, g, jsonify, request
from werkzeug.exceptions import NotFound

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.espacios_comunes.schemas import (
    DisponibilidadQuerySchema,
    EspacioCreateSchema,
    EspacioUpdateSchema,
)
from app.modules.espacios_comunes import services

espacios_bp = Blueprint("espacios_comunes", __name__, url_prefix="/condominio/espacios")

@espacios_bp.get("")
@token_required
def list_espacios():
    return jsonify(services.list_espacios(g.current_user["rol"]))

@espacios_bp.post("")
@token_required
@role_required("ADMIN")
def create_espacio():
    data = read_json(EspacioCreateSchema())

    espacio = services.create_espacio(data)

    return jsonify(espacio), 201

@espacios_bp.get("/<int:espacio_id>")
@token_required
def get_espacio(espacio_id):
    espacio = services.get_espacio(espacio_id)

    if not espacio:
        raise NotFound("Espacio no encontrado")

    return jsonify(espacio)

@espacios_bp.patch("/<int:espacio_id>")
@token_required
@role_required("ADMIN")
def edit_espacio(espacio_id):
    data = read_json(EspacioUpdateSchema(), partial=True)

    if not services.update_espacio(espacio_id, data):
        raise NotFound("Espacio no encontrado")

    return jsonify({"message": "Espacio actualizado"})

@espacios_bp.get("/<int:espacio_id>/disponibilidad")
@token_required
def disponibilidad(espacio_id):
    args = DisponibilidadQuerySchema().load(request.args.to_dict())

    return jsonify(services.get_disponibilidad(
        espacio_id,
        args["fecha_inicio"],
        args["fecha_fin"],
        args["id_tipo_evento"],
    ))
