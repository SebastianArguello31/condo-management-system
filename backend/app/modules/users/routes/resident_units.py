from flask import Blueprint, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.resident_units import ResidentUnitSchema
from app.modules.users.services import resident_units as services

resident_units_bp = Blueprint("resident_units", __name__)

@resident_units_bp.get("/users/<int:user_id>/units")
@token_required
@role_required("ADMIN")
def list_resident_units(user_id):
    return jsonify(services.get_resident_units(user_id))

@resident_units_bp.post("/users/<int:user_id>/units")
@token_required
@role_required("ADMIN")
def add_resident_unit(user_id):
    data = read_json(ResidentUnitSchema())
    return jsonify(services.link_resident_unit(user_id, data["id_unidad"]))

@resident_units_bp.delete("/users/<int:user_id>/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def remove_resident_unit(user_id, unit_id):
    services.unlink_resident_unit(user_id, unit_id)
    return "", 204
