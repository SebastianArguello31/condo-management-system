# Rutas HTTP para gestores.
# Conecta las solicitudes con los servicios y declara la autenticación y los roles de cada operación.
from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.users.schemas.managers import ManagerCreateSchema, ManagerUpdateSchema
from app.modules.users.services import managers
from app.modules.users.services.accounts import delete_account

managers_bp = Blueprint("managers", __name__, url_prefix="/managers")

@managers_bp.get("")
@token_required
@role_required("ADMIN")
def list_managers():
    return jsonify(managers.list_managers())

@managers_bp.post("")
@token_required
@role_required("ADMIN")
def create_manager():
    data = read_json(ManagerCreateSchema())

    return jsonify(managers.create_manager(data, g.current_user["id_usuario"])), 201

@managers_bp.patch("/<int:user_id>")
@token_required
@role_required("ADMIN")
def update_manager(user_id):
    data = read_json(ManagerUpdateSchema(), partial=True)

    return jsonify(
        managers.update_manager(
            user_id,
            data,
            g.current_user["id_usuario"],
        )
    )

@managers_bp.delete("/<int:user_id>")
@token_required
@role_required("ADMIN")
def delete_manager(user_id):
    delete_account(
        user_id,
        g.current_user["id_usuario"],
        "GESTOR",
    )
    return "", 204