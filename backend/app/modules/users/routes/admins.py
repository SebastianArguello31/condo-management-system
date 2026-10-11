from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.admins import (AdminCreateSchema, AdminUpdateSchema)
from app.modules.users.services import admins
from app.modules.users.services.accounts import delete_account

admins_bp = Blueprint("admins", __name__, url_prefix="/admins")

@admins_bp.get("")
@token_required
@role_required("ADMIN")
def list_admins():
    return jsonify(admins.list_admins())

@admins_bp.post("")
@token_required
@role_required("ADMIN")
def create_admin():
    data = read_json(AdminCreateSchema())

    return jsonify(admins.create_admin(data, g.current_user["id_usuario"])), 201

@admins_bp.patch("/<int:user_id>")
@token_required
@role_required("ADMIN")
def update_admin(user_id):
    data = read_json(AdminUpdateSchema(), partial=True)

    return jsonify(admins.update_admin(user_id, data, g.current_user["id_usuario"]))

@admins_bp.delete("/<int:user_id>")
@token_required
@role_required("ADMIN")
def delete_admin(user_id):
    delete_account(user_id, g.current_user["id_usuario"], "ADMIN")
    return "", 204