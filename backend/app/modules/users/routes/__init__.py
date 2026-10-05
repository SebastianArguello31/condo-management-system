from flask import Blueprint

from .accesses import accesses_bp
from .admins import admin_bp
from .employees import employee_bp
from .resident_units import resident_units_bp
from .residents import resident_bp
from .specialties import specialty_bp

user_bp = Blueprint("users", __name__)
user_bp.register_blueprint(accesses_bp)
user_bp.register_blueprint(admin_bp)
user_bp.register_blueprint(employee_bp)
user_bp.register_blueprint(resident_units_bp)
user_bp.register_blueprint(resident_bp)
user_bp.register_blueprint(specialty_bp)
