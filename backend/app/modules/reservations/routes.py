from flask import Blueprint, g, jsonify, request

from app.core.decorators import (role_required, token_required)
from app.core.validation import read_json
from app.modules.reservations import services
from app.modules.reservations.schemas import ReservationCreateSchema, ReservationListQuerySchema, ReservationStatusSchema

reservations_bp = Blueprint("reservations", __name__, url_prefix="/reservations")

@reservations_bp.post("")
@token_required
@role_required("RESIDENTE")
def create_reservation():
    data = read_json(ReservationCreateSchema())

    return jsonify(services.create_reservation(data, g.current_user)), 201

@reservations_bp.get("")
@token_required
@role_required("RESIDENTE", "ADMIN")
def list_reservations():
    params = ReservationListQuerySchema().load(request.args.to_dict())

    return jsonify(
        services.list_reservations(
            g.current_user,
            space=params["espacio"],
            status=params["estado"],
            reservation_date=params["fecha"],
            resident_id=params["residente"],
        )
    )

@reservations_bp.get("/event-types")
@token_required
def list_event_types():
    return jsonify(services.list_event_types())

@reservations_bp.get("/<int:reservation_id>")
@token_required
@role_required("RESIDENTE", "ADMIN")
def get_reservation(reservation_id):
    return jsonify(services.get_reservation(reservation_id, g.current_user))

@reservations_bp.patch("/<int:reservation_id>/status")
@token_required
@role_required("RESIDENTE", "ADMIN")
def update_status(reservation_id):
    data = read_json(ReservationStatusSchema())

    return jsonify(services.update_reservation_status(reservation_id, data["estado"], g.current_user))