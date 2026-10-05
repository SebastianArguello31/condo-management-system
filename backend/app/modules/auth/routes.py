from flask import Blueprint, g, jsonify
from werkzeug.exceptions import Unauthorized

from app.core.decorators import token_required
from app.core.validation import read_json
from app.modules.auth.schemas import LoginSchema
from app.modules.auth.services import authenticate_user

auth_bp = Blueprint("auth", __name__, url_prefix="/condominio/auth",)

@auth_bp.post("/login")
def login():
    data = read_json(LoginSchema())
    result = authenticate_user(**data)

    if result is None:
        raise Unauthorized("Credenciales invÃ¡lidas")

    return jsonify(result)

@auth_bp.get("/me")
@token_required
def me():
    return jsonify(g.current_user)