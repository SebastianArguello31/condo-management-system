from flask import Blueprint, g, jsonify, request

from app.core.decorators import role_required, token_required
from app.modules.analytics.schemas import AnalyticsFilterSchema, DrilldownSchema
from app.modules.analytics.services import incidents, interventions, inventory, overview

analytics_bp = Blueprint("analytics", __name__, url_prefix="/analytics")


def _read_args(schema):
    # Los parámetros vacíos (?id_edificio=) se tratan como "sin filtro".
    return schema.load({key: value for key, value in request.args.items() if value.strip()})


@analytics_bp.get("/dashboard")
@token_required
@role_required("ADMIN", "TECNICO")
def get_dashboard():
    return jsonify(overview.get_dashboard_overview(_read_args(AnalyticsFilterSchema()), g.current_user))


@analytics_bp.get("/incidencias")
@token_required
@role_required("ADMIN", "TECNICO")
def get_incidents_analytics():
    return jsonify(incidents.get_incident_metrics(_read_args(AnalyticsFilterSchema()), g.current_user))


@analytics_bp.get("/intervenciones")
@token_required
@role_required("ADMIN", "TECNICO")
def get_interventions_analytics():
    return jsonify(interventions.get_intervention_metrics(_read_args(AnalyticsFilterSchema()), g.current_user))


@analytics_bp.get("/inventario")
@token_required
@role_required("ADMIN", "TECNICO")
def get_inventory_analytics():
    return jsonify(inventory.get_inventory_metrics(_read_args(AnalyticsFilterSchema()), g.current_user))


@analytics_bp.get("/registros")
@token_required
@role_required("ADMIN", "TECNICO")
def get_records():
    args = _read_args(DrilldownSchema())
    record_type = args.pop("tipo_registro")
    status = args.pop("estado", None)
    limit = args.pop("limit")
    return jsonify(overview.get_records(record_type, args, g.current_user, status=status, limit=limit))


@analytics_bp.get("/filtros")
@token_required
@role_required("ADMIN", "TECNICO")
def get_filter_options():
    return jsonify(overview.get_filter_options(g.current_user))
