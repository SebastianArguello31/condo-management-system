from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.residents import (
    ResidentCreateSchema,
    ResidentProfileUpdateSchema,
    ResidentUpdateSchema,
)
from app.modules.users.services import residents

resident_bp = Blueprint("residents", __name__, url_prefix="/residents")


@resident_bp.get("")
@token_required
@role_required("ADMIN")
def list_residents():
    return jsonify(residents.list_residents())


@resident_bp.post("")
@token_required
@role_required("ADMIN")
def create_resident():
    data = read_json(ResidentCreateSchema())
    result = residents.create_resident(data, g.current_user["id_usuario"])
    return jsonify(result), 201


@resident_bp.patch("/<int:user_id>")
@token_required
@role_required("ADMIN")
def update_resident(user_id):
    data = read_json(ResidentUpdateSchema(), partial=True)
    return jsonify(
        residents.update_resident(user_id, data, g.current_user["id_usuario"])
    )


@resident_bp.delete("/<int:user_id>")
@token_required
@role_required("ADMIN")
def deactivate_resident(user_id):
    residents.deactivate_resident(user_id, g.current_user["id_usuario"])
    return "", 204


@resident_bp.get("/me")
@token_required
@role_required("RESIDENTE")
def my_profile():
    return jsonify(residents.get_my_profile(g.current_user["id_usuario"]))


@resident_bp.patch("/me")
@token_required
@role_required("RESIDENTE")
def update_my_profile():
    data = read_json(ResidentProfileUpdateSchema(), partial=True)
    return jsonify(
        residents.update_my_profile(g.current_user["id_usuario"], data)
    )


@resident_bp.get("/me/units")
@token_required
@role_required("RESIDENTE")
def my_units():
    return jsonify(residents.get_my_units(g.current_user["id_usuario"]))
