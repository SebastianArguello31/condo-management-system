from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.admins import AdminCreateSchema, AdminUpdateSchema
from app.modules.users.services import admins as services
from app.modules.users.services.accounts import delete_account

admin_bp = Blueprint("admins", __name__, url_prefix="/admins")

@admin_bp.get("", strict_slashes=False)
@token_required
@role_required("ADMIN")
def list_admins():
    return jsonify(services.list_admins())

@admin_bp.post("", strict_slashes=False)
@token_required
@role_required("ADMIN")
def create_admin():
    data = read_json(AdminCreateSchema())
    account = services.create_admin(data, g.current_user["id_usuario"])
    return jsonify(account), 201

@admin_bp.patch("/<int:user_id>")
@token_required
@role_required("ADMIN")
def update_admin(user_id):
    data = read_json(AdminUpdateSchema(), partial=True)
    account = services.update_admin(user_id, data, g.current_user["id_usuario"])
    return jsonify(account)

@admin_bp.delete("/<int:user_id>")
@token_required
@role_required("ADMIN")
def delete_admin(user_id):
    delete_account(user_id, g.current_user["id_usuario"], "ADMIN")
    return "", 204
