from flask import Blueprint, g, jsonify
from werkzeug.exceptions import NotFound

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas import UserCreateSchema, UserUpdateSchema, ResidentUnitSchema
from app.modules.users import services

user_bp = Blueprint("users", __name__, url_prefix="/condominio/users",)

@user_bp.get("", strict_slashes=False)
@token_required
@role_required("ADMIN")
def list_users():
    return jsonify(services.get_all_users())

@user_bp.get("/roles")
@token_required
@role_required("ADMIN")
def list_roles():
    return jsonify(services.get_roles())

@user_bp.get("/me")
@token_required
def get_current_user():
    return jsonify(g.current_user)

@user_bp.get("/<int:user_id>")
@token_required
@role_required("ADMIN")
def get_user(user_id):
    user = services.get_user_by_id(user_id)

    if not user:
        raise NotFound("Usuario no encontrado")

    return jsonify(user)

@user_bp.post("", strict_slashes=False)
@token_required
@role_required("ADMIN")
def register_user():
    data = read_json(UserCreateSchema())
    return jsonify(services.create_user(**data)), 201

@user_bp.patch("/<int:user_id>")
@token_required
@role_required("ADMIN")
def edit_user(user_id):
    data = read_json(UserUpdateSchema(), partial=True)

    user = services.update_user(
        user_id,
        data,
        g.current_user["id_usuario"],
    )

    if not user:
        raise NotFound("Usuario no encontrado")

    return jsonify(user)

@user_bp.delete("/<int:user_id>")
@token_required
@role_required("ADMIN")
def remove_user(user_id):
    deleted = services.delete_user(
        user_id,
        g.current_user["id_usuario"],
    )

    if not deleted:
        raise NotFound("Usuario no encontrado")

    return "", 204

@user_bp.get("/<int:user_id>/units")
@token_required
@role_required("ADMIN")
def list_resident_units(user_id):
    return jsonify(services.get_resident_units(user_id))

@user_bp.post("/<int:user_id>/units")
@token_required
@role_required("ADMIN")
def add_resident_unit(user_id):
    data = read_json(ResidentUnitSchema())

    return jsonify(
        services.link_resident_unit(
            user_id,
            data["id_unidad"],
        )
    )

@user_bp.delete("/<int:user_id>/units/<int:unit_id>")
@token_required
@role_required("ADMIN")
def remove_resident_unit(user_id, unit_id):
    services.unlink_resident_unit(user_id, unit_id)
    return "", 204