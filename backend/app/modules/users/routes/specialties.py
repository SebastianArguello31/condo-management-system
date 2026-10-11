from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.specialties import (SpecialtyCreateSchema, SpecialtyUpdateSchema)
from app.modules.users.services import specialties

specialties_bp = Blueprint("specialties", __name__, url_prefix="/specialties")

@specialties_bp.get("")
@token_required
@role_required("ADMIN")
def list_specialties():
    return jsonify(specialties.list_specialties())

@specialties_bp.post("")
@token_required
@role_required("ADMIN")
def create_specialty():
    data = read_json(SpecialtyCreateSchema())

    return jsonify(specialties.create_specialty(data, g.current_user["id_usuario"])), 201

@specialties_bp.patch("/<int:specialty_id>")
@token_required
@role_required("ADMIN")
def update_specialty(specialty_id):
    data = read_json(SpecialtyUpdateSchema(), partial=True)

    return jsonify(specialties.update_specialty(
        specialty_id,
        data,
        g.current_user["id_usuario"],
    ))

@specialties_bp.delete("/<int:specialty_id>")
@token_required
@role_required("ADMIN")
def delete_specialty(specialty_id):
    specialties.delete_specialty(specialty_id, g.current_user["id_usuario"])
    return "", 204