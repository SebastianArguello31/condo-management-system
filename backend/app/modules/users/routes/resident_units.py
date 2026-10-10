from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.resident_units import ResidentUnitSchema
from app.modules.users.services import resident_units

resident_units_bp = Blueprint("resident_units", __name__)

@resident_units_bp.get("/users/<int:user_id>/units")
@token_required
@role_required("ADMIN")
def list_units(user_id):
    return jsonify(resident_units.list_resident_units(user_id))

@resident_units_bp.post("/users/<int:user_id>/units")
@token_required
@role_required("ADMIN")
def link_unit(user_id):
    data = read_json(ResidentUnitSchema())

    return jsonify(resident_units.link_unit(
        user_id,
        data["id_unidad"],
        g.current_user["id_usuario"],
    ))

@resident_units_bp.delete("/users/<int:user_id>/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def unlink_unit(user_id, unit_id):
    resident_units.unlink_unit(user_id, unit_id, g.current_user["id_usuario"])
    return "", 204