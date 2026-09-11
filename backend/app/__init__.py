from flask import Flask, jsonify
from marshmallow import ValidationError
from psycopg2.errors import ForeignKeyViolation, UniqueViolation
from werkzeug.exceptions import HTTPException
from pathlib import Path

from app.core.config import Config
from app.modules.auth.routes import auth_bp
from app.modules.units.routes import units_bp
from app.modules.users.routes import user_bp
from app.modules.incidents.routes import incidents_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Hasta 3 archivos de 5 MB, más los datos del formulario.
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
    app.config["MAX_FORM_MEMORY_SIZE"] = 64 * 1024
    app.config["MAX_FORM_PARTS"] = 20

    upload_dir = Path(app.instance_path) / "uploads" / "incidents"
    upload_dir.mkdir(parents=True, exist_ok=True)

    app.config["INCIDENT_UPLOAD_DIR"] = str(upload_dir.resolve())

    if not app.config["JWT_SECRET_KEY"]:
        raise RuntimeError("Debes configurar JWT_SECRET_KEY")

    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(units_bp)
    app.register_blueprint(incidents_bp)

    @app.errorhandler(ValidationError)
    def validation_error(error):
        return jsonify({
            "error": "Revisa los campos del formulario",
            "errors": error.messages,
        }), 400

    @app.errorhandler(UniqueViolation)
    def unique_error(error):
        return jsonify({
            "error": "Ya existe un registro con ese valor único; "
                     "comprueba el email."
        }), 409

    @app.errorhandler(ForeignKeyViolation)
    def foreign_key_error(error):
        return jsonify({
            "error": "La operación no es válida: hay registros "
                     "relacionados o una referencia seleccionada "
                     "ya no existe."
        }), 409

    @app.errorhandler(HTTPException)
    def http_error(error):
        response = error.get_response()
        response.data = app.json.dumps({"error": error.description})
        response.content_type = "application/json"
        return response

    @app.errorhandler(Exception)
    def unexpected_error(error):
        app.logger.exception("Error no controlado")
        return jsonify({
            "error": "Ocurrió un error interno en el servidor"
        }), 500

    @app.get("/")
    def index():
        return {"message": "API de gestión de condominios funcionando"}

    return app