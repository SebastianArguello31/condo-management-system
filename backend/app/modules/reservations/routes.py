from flask import Blueprint, g, jsonify

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.reservations.schemas import ReservaCreateSchema
from app.modules.reservations import services

reservas_bp = Blueprint("reservas", __name__, url_prefix="/condominio/reservas")

@reservas_bp.post("")
@token_required
@role_required("RESIDENTE")
def create_reserva():
    data = read_json(ReservaCreateSchema())

    reserva = services.create_reserva(data, g.current_user["id_usuario"])

    return jsonify(reserva), 201
