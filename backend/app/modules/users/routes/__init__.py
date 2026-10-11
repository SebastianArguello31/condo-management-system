from flask import Blueprint

from .accesses import accesses_bp
from .admins import admins_bp
from .employees import employees_bp
from .resident_units import resident_units_bp
from .residents import residents_bp
from .specialties import specialties_bp

user_bp = Blueprint("users", __name__)

for blueprint in (
    accesses_bp,
    admins_bp,
    employees_bp,
    resident_units_bp,
    residents_bp,
    specialties_bp,
):
    user_bp.register_blueprint(blueprint)