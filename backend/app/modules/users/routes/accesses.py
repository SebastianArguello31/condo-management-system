from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.accounts import AccessUpdateSchema
from app.modules.users.services import accounts

accesses_bp = Blueprint("accesses", __name__)

@accesses_bp.get("/users")
@token_required
@role_required("ADMIN")
def list_users():
    return jsonify(accounts.list_accounts())

@accesses_bp.get("/users/roles")
@token_required
@role_required("ADMIN")
def list_roles():
    return jsonify(accounts.list_roles())

@accesses_bp.get("/users/<int:user_id>")
@token_required
@role_required("ADMIN")
def get_user(user_id):
    return jsonify(accounts.get_account(user_id))

@accesses_bp.patch("/users/<int:user_id>")
@token_required
@role_required("ADMIN")
def update_access(user_id):
    data = read_json(AccessUpdateSchema())

    return jsonify(accounts.update_managed_account(
        user_id,
        data,
        g.current_user["id_usuario"],
        access_only=True,
    ))

@accesses_bp.delete("/users/<int:user_id>")
@token_required
@role_required("ADMIN")
def delete_user(user_id):
    accounts.delete_account(user_id, g.current_user["id_usuario"])
    return "", 204