from flask import Blueprint, Flask, jsonify
from marshmallow import ValidationError
from psycopg2.errors import ForeignKeyViolation, UniqueViolation
from werkzeug.exceptions import HTTPException

from app.core.config import Config
from app.modules.auth.routes import auth_bp
from app.modules.users.routes import user_bp
from app.modules.units.routes import units_bp
from app.modules.incidents.routes import incidents_bp
from app.modules.common_spaces.routes import common_spaces_bp
from app.modules.reservations.routes import reservations_bp

def create_app(config=None):
    app = Flask(__name__)

    configure_app(app, config)
    register_routes(app)
    register_errors(app)

    return app

def configure_app(app, config):
    if config is None:
        app.config.from_object(Config)
    else:
        app.config.from_mapping(config)

    if not app.config.get("JWT_SECRET_KEY"):
        raise RuntimeError("Debes configurar JWT_SECRET_KEY")

    app.url_map.strict_slashes = False

    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
    app.config["MAX_FORM_MEMORY_SIZE"] = 64 * 1024
    app.config["MAX_FORM_PARTS"] = 20


def register_routes(app):
    api = Blueprint("api", __name__, url_prefix="/condominio")

    blueprints = [auth_bp, user_bp, units_bp, incidents_bp, common_spaces_bp, reservations_bp,]

    for blueprint in blueprints:
        api.register_blueprint(blueprint)

    app.register_blueprint(api)

    @app.get("/")
    def index():
        return {"message": "API de gestión de condominios funcionando"}

def register_errors(app):
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        return jsonify(
            error="Revisa los campos del formulario", errors=error.messages
        ), 400

    @app.errorhandler(UniqueViolation)
    def handle_duplicate_value(error):
        messages = {
            "uq_usuarios_correo_normalizado": "El correo ya pertenece a otra cuenta.",
            "usuarios_email_key": "El correo ya pertenece a otra cuenta.",
            "uq_especialidades_nombre": "Ya existe una especialidad con ese nombre.",
        }
        message = messages.get(
            error.diag.constraint_name,
            "Ya existe un registro con un valor que debe ser único.",
        )
        return jsonify(error=message), 409

    @app.errorhandler(ForeignKeyViolation)
    def handle_invalid_reference(error):
        return jsonify(
            error=("La operación no es válida: existen registros relacionados o la referencia ya no existe.")
        ), 409

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        response = error.get_response()
        response.data = app.json.dumps({"error": error.description})
        response.content_type = "application/json"
        return response

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception("Error no controlado")

        return jsonify(
            error="Ocurrió un error interno en el servidor"
        ), 500