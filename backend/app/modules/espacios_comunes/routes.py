from flask import Blueprint, g, jsonify, request
from werkzeug.exceptions import NotFound

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.espacios_comunes.schemas import DisponibilidadQuerySchema, EspacioCreateSchema, PolicySchema,EspacioUpdateSchema
from app.modules.espacios_comunes import services

espacios_bp = Blueprint("espacios_comunes", __name__, url_prefix="/common-spaces")

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

@espacios_bp.get("/<int:espacio_id>/availability")
@token_required
def disponibilidad(espacio_id):
    args = DisponibilidadQuerySchema().load(request.args.to_dict())

    return jsonify(services.get_disponibilidad(
        espacio_id,
        args["fecha_inicio"],
        args["fecha_fin"],
        args["id_tipo_evento"],
    ))

@espacios_bp.get("/<int:espacio_id>/policies")
@token_required
@role_required("ADMIN")
def list_policies(espacio_id):
    return jsonify(services.list_policies(espacio_id))

@espacios_bp.post("/<int:espacio_id>/policies")
@token_required
@role_required("ADMIN")
def create_policy(espacio_id):
    return jsonify(services.save_policy(espacio_id, read_json(PolicySchema()))), 201

@espacios_bp.put("/<int:espacio_id>/policies/<int:policy_id>")
@token_required
@role_required("ADMIN")
def replace_policy(espacio_id, policy_id):
    return jsonify(services.save_policy(espacio_id, read_json(PolicySchema()), policy_id))

@espacios_bp.delete("/<int:espacio_id>/policies/<int:policy_id>")
@token_required
@role_required("ADMIN")
def delete_policy(espacio_id, policy_id):
    services.delete_policy(espacio_id, policy_id)
    return "", 204
