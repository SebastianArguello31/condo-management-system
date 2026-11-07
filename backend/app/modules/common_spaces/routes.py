from flask import Blueprint, g, jsonify, request

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.common_spaces import services
from app.modules.common_spaces.schemas import AvailabilityQuerySchema, PolicySchema, SpaceCreateSchema, SpaceUpdateSchema

common_spaces_bp = Blueprint("common_spaces", __name__, url_prefix="/common-spaces")

@common_spaces_bp.get("")
@token_required
def list_spaces():
    return jsonify(services.list_spaces(g.current_user["rol"]))

@common_spaces_bp.post("")
@token_required
@role_required("ADMIN")
def create_space():
    data = read_json(SpaceCreateSchema())

    return jsonify(services.create_space(data)), 201

@common_spaces_bp.get("/<int:space_id>")
@token_required
def get_space(space_id):
    return jsonify(services.get_space(space_id))

@common_spaces_bp.patch("/<int:space_id>")
@token_required
@role_required("ADMIN")
def update_space(space_id):
    data = read_json(SpaceUpdateSchema(), partial=True)
    services.update_space(space_id, data)

    return jsonify({"message": "Espacio actualizado"})

@common_spaces_bp.get("/<int:space_id>/availability")
@token_required
def get_availability(space_id):
    params = AvailabilityQuerySchema().load(request.args.to_dict())

    return jsonify(
        services.get_availability(
            space_id,
            params["fecha_inicio"],
            params["fecha_fin"],
            params["id_tipo_evento"],
        )
    )

@common_spaces_bp.get("/<int:space_id>/policies")
@token_required
@role_required("ADMIN")
def list_policies(space_id):
    return jsonify(services.list_policies(space_id))

@common_spaces_bp.post("/<int:space_id>/policies")
@token_required
@role_required("ADMIN")
def create_policy(space_id):
    data = read_json(PolicySchema())

    return jsonify(services.save_policy(space_id, data)), 201

@common_spaces_bp.put("/<int:space_id>/policies/<int:policy_id>")
@token_required
@role_required("ADMIN")
def replace_policy(space_id, policy_id):
    data = read_json(PolicySchema())

    return jsonify(services.save_policy(space_id, data, policy_id))

@common_spaces_bp.delete("/<int:space_id>/policies/<int:policy_id>")
@token_required
@role_required("ADMIN")
def delete_policy(space_id, policy_id):
    services.delete_policy(space_id, policy_id)

    return "", 204