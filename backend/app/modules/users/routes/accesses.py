from flask import Blueprint, g, jsonify
from werkzeug.exceptions import NotFound

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.accounts import AccessUpdateSchema
from app.modules.users.services import accounts as services

accesses_bp = Blueprint("accesses", __name__)

@accesses_bp.get("/users", strict_slashes=False)
@token_required
@role_required("ADMIN")
def list_users():
    return jsonify(services.get_all_users())

@accesses_bp.get("/users/roles")
@token_required
@role_required("ADMIN")
def list_roles():
    return jsonify(services.get_roles())

@accesses_bp.get("/users/me")
@token_required
def me():
    return jsonify(g.current_user)

@accesses_bp.get("/users/<int:user_id>")
@token_required
@role_required("ADMIN")
def get_user(user_id):
    account = services.get_user_by_id(user_id)
    if not account:
        raise NotFound("Usuario no encontrado")
    return jsonify(account)

@accesses_bp.patch("/users/<int:user_id>")
@token_required
@role_required("ADMIN")
def update_access(user_id):
    data = read_json(AccessUpdateSchema())
    return jsonify(services.update_managed_account(
        user_id, data, g.current_user["id_usuario"], access_only=True))

@accesses_bp.delete("/users/<int:user_id>")
@token_required
@role_required("ADMIN")
def delete_user(user_id):
    services.delete_account(user_id, g.current_user["id_usuario"])
    return "", 204
