from flask import Blueprint, current_app, g, jsonify
from redis.exceptions import RedisError
from werkzeug.exceptions import ServiceUnavailable, Unauthorized

from app.core.decorators import token_required
from app.core.rate_limit import limiter, recovery_email_key
from app.core.validation import read_json
from app.modules.auth.jobs import enqueue_password_reset
from app.modules.auth.password_reset import reset_password
from app.modules.auth.schemas import ForgotPasswordSchema, LoginSchema, ResetPasswordSchema
from app.modules.auth.services import authenticate_user

auth_bp = Blueprint("auth", __name__, url_prefix="/auth",)

@auth_bp.post("/login")
def login():
    data = read_json(LoginSchema())

    result = authenticate_user(data["email"], data["password"])

    if result is None:
        raise Unauthorized("Credenciales inválidas")

    return jsonify(result)

@auth_bp.get("/me")
@token_required
def get_session():
    return jsonify(g.current_user)

RECOVERY_MESSAGE = (
    "Si existe una cuenta habilitada con ese correo, "
    "recibirás un enlace para restablecer tu contraseña."
)

@auth_bp.post("/forgot-password")
@limiter.limit(
    "5 per minute",
    error_message="Demasiadas solicitudes. Inténtalo más tarde.",
)
@limiter.limit(
    "3 per hour",
    key_func=recovery_email_key,
    error_message="Demasiadas solicitudes. Inténtalo más tarde.",
)
def forgot_password():
    data = read_json(ForgotPasswordSchema())
    email = data["email"].strip().lower()

    try:
        enqueue_password_reset(email)
    except RedisError:
        current_app.logger.error("No se pudo encolar la recuperación de contraseña")
        raise ServiceUnavailable("No se pudo procesar la solicitud. Inténtalo más tarde.") from None

    response = jsonify(message=RECOVERY_MESSAGE)
    response.status_code = 202
    response.headers["Cache-Control"] = "no-store"
    return response

@auth_bp.post("/reset-password")
@limiter.limit(
    "10 per minute",
    error_message="Demasiados intentos. Inténtalo más tarde.",
)
def reset_forgotten_password():
    data = read_json(ResetPasswordSchema())

    reset_password(
        data["token"],
        data["password"],
    )

    response = jsonify(message="Contraseña actualizada. Ya puedes iniciar sesión.")
    response.headers["Cache-Control"] = "no-store"
    return response