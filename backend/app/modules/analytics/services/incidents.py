from app.core.db_helpers import transaction
from app.modules.analytics.repositories import incidents as repo
from app.modules.analytics.services.common import (
    numeric_rows,
    percentage,
    technician_scope,
    to_number,
    with_percentage,
)


def compute(filters, user, *, cursor):
    scope = technician_scope(user)
    kpis = repo.get_incident_kpis(filters, scope, cursor=cursor)

    total = kpis["total_incidencias"] or 0
    resolved = kpis["incidencias_resueltas"] or 0

    return {
        "resumen": {
            "total_incidencias": total,
            "incidencias_pendientes": kpis["incidencias_pendientes"] or 0,
            "incidencias_resueltas": resolved,
            "incidencias_descartadas": kpis["incidencias_descartadas"] or 0,
            "tasa_resolucion_porcentaje": percentage(resolved, total),
            # None (y no 0) cuando no hay resueltas: 0 horas sería un dato falso.
            "tiempo_promedio_resolucion_horas": (
                to_number(kpis["tiempo_promedio_resolucion_horas"])
                if kpis["tiempo_promedio_resolucion_horas"] is not None else None
            ),
            "tasa_cumplimiento_sla_porcentaje": (
                percentage(kpis["resueltas_en_plazo"], kpis["total_con_plazo"])
                if kpis["total_con_plazo"] else None
            ),
            "resueltas_en_plazo": kpis["resueltas_en_plazo"] or 0,
            "resueltas_con_plazo": kpis["total_con_plazo"] or 0,
        },
        "por_estado": with_percentage(repo.get_incidents_by_status(filters, scope, cursor=cursor), total),
        "por_prioridad": with_percentage(repo.get_incidents_by_priority(filters, scope, cursor=cursor), total),
        "por_tipo": with_percentage(repo.get_incidents_by_type(filters, scope, cursor=cursor), total),
        "evolucion_temporal": repo.get_incidents_timeline(filters, scope, cursor=cursor),
        "tiempos_por_prioridad": numeric_rows(
            repo.get_resolution_times_by_priority(filters, scope, cursor=cursor), "horas_promedio",
        ),
    }


def get_incident_metrics(filters, user):
    with transaction() as cursor:
        return compute(filters, user, cursor=cursor)


def list_records(record_type, filters, user, *, status=None, limit=100):
    statuses = {
        "incidencias_pendientes": repo.PENDING_STATUSES,
        "incidencias_resueltas": repo.RESOLVED_STATUSES,
    }.get(record_type)
    with transaction() as cursor:
        return repo.list_incidents(
            filters, technician_scope(user),
            statuses=statuses, status=status, limit=limit, cursor=cursor,
        )
