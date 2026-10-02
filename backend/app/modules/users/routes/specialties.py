from flask import Blueprint, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.specialties import SpecialtyCreateSchema, SpecialtyUpdateSchema
from app.modules.users.services import specialties as services

specialty_bp = Blueprint("specialties", __name__, url_prefix="/specialties")

@specialty_bp.get("", strict_slashes=False)
@token_required
@role_required("ADMIN")
def list_specialties():
    return jsonify(services.list_specialties())

@specialty_bp.post("", strict_slashes=False)
@token_required
@role_required("ADMIN")
def create_specialty():
    data = read_json(SpecialtyCreateSchema())
    return jsonify(services.create_specialty(data)), 201

@specialty_bp.patch("/<int:specialty_id>")
@token_required
@role_required("ADMIN")
def update_specialty(specialty_id):
    data = read_json(SpecialtyUpdateSchema(), partial=True)
    return jsonify(services.update_specialty(specialty_id, data))

@specialty_bp.delete("/<int:specialty_id>")
@token_required
@role_required("ADMIN")
def delete_specialty(specialty_id):
    services.delete_specialty(specialty_id)
    return "", 204
