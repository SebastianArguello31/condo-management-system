from flask import Blueprint, g, jsonify, request

from app.core.decorators import role_required, token_required
from app.core.validation import read_json
from app.modules.reservations.schemas import (
    ReservaCreateSchema,
    ReservaListQuerySchema,
    ReservaStatusSchema,
)
from app.modules.reservations import services

reservas_bp = Blueprint("reservas", __name__, url_prefix="/reservations")

@reservas_bp.post("")
@token_required
@role_required("RESIDENTE")
def create_reserva():
    data = read_json(ReservaCreateSchema())

    reserva = services.create_reserva(data, g.current_user["id_usuario"])

    return jsonify(reserva), 201

@reservas_bp.get("")
@token_required
@role_required("RESIDENTE", "ADMIN")
def list_reservas():
    args = ReservaListQuerySchema().load(request.args.to_dict())

    return jsonify(services.list_reservas(
        g.current_user,
        args["espacio"],
        args["estado"],
        args["fecha"],
        args["residente"],
    ))

@reservas_bp.get("/event-types")
@token_required
def list_tipos_evento():
    return jsonify(services.list_tipos_evento())

@reservas_bp.get("/<int:reserva_id>")
@token_required
@role_required("RESIDENTE", "ADMIN")
def detail_reserva(reserva_id):
    return jsonify(services.get_reserva_detail(reserva_id, g.current_user))

@reservas_bp.patch("/<int:reserva_id>/status")
@token_required
@role_required("RESIDENTE", "ADMIN")
def update_status(reserva_id):
    data = read_json(ReservaStatusSchema())
    if data["estado"] == "CANCELADA":
        return jsonify(services.cancel_reserva(reserva_id, g.current_user))
    if g.current_user["rol"] != "ADMIN":
        from werkzeug.exceptions import Forbidden
        raise Forbidden("Solo administradores pueden aprobar o rechazar reservas")
    return jsonify(services.cambiar_estado_reserva(reserva_id, data["estado"]))
