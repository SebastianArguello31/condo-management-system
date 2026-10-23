from app.core.db_helpers import query
from app.modules.analytics.repositories.incidents import (
    INCIDENT_FROM,
    CURRENT_STATUS,
    build_incident_filters,
    date_range,
    sql_list,
)
from app.modules.incidents.rules import INTERVENTION_STATUSES

# Incidencias en un estado que admite intervención, pero sin ninguna registrada.
PENDING_INTERVENTION = f"""
    {CURRENT_STATUS} IN ({sql_list(sorted(INTERVENTION_STATUSES))})
    AND NOT EXISTS (SELECT 1 FROM intervenciones pv WHERE pv.id_incidencia = i.id_incidencia)
"""

INTERVENTION_FROM = """
    FROM intervenciones v
    JOIN incidencias i ON i.id_incidencia = v.id_incidencia
    JOIN usuarios tec ON tec.id_usuario = v.id_personal
    LEFT JOIN unidades u ON u.id_unidad = i.id_unidad
    LEFT JOIN espacios_comunes ec ON ec.id_espacio_comun = i.id_espacio_comun
"""


def build_intervention_filters(filters, technician_id=None):
    conditions, params = date_range("v.fecha_inicio", filters)

    if filters.get("id_edificio"):
        conditions.append("COALESCE(u.id_edificio, ec.id_edificio) = %s")
        params.append(filters["id_edificio"])

    if filters.get("id_tipo_incidencia"):
        conditions.append("i.id_tipo_incidencia = %s")
        params.append(filters["id_tipo_incidencia"])

    if filters.get("id_prioridad"):
        conditions.append("i.id_prioridad = %s")
        params.append(filters["id_prioridad"])

    if filters.get("id_tecnico"):
        conditions.append("v.id_personal = %s")
        params.append(filters["id_tecnico"])

    if technician_id is not None:
        conditions.append("v.id_personal = %s")
        params.append(technician_id)

    return " AND ".join(conditions) or "TRUE", params


def get_intervention_kpis(filters, technician_id=None, *, cursor):
    where, params = build_intervention_filters(filters, technician_id)
    done = query(
        f"SELECT COUNT(*) AS total_intervenciones {INTERVENTION_FROM} WHERE {where}",
        tuple(params), cursor=cursor,
    )

    incident_where, incident_params = build_incident_filters(filters, technician_id)
    pending = query(
        f"""
        SELECT COUNT(*) AS pendientes_intervencion
        {INCIDENT_FROM}
        WHERE {incident_where} AND {PENDING_INTERVENTION}
        """,
        tuple(incident_params), cursor=cursor,
    )

    return {
        "total_intervenciones": done["total_intervenciones"],
        "pendientes_intervencion": pending["pendientes_intervencion"],
    }


def get_interventions_by_technician(filters, technician_id=None, *, cursor):
    where, params = build_intervention_filters(filters, technician_id)
    return query(
        f"""
        SELECT tec.id_usuario AS id_tecnico, tec.nombre AS tecnico_nombre,
               tec.apellido AS tecnico_apellido, COUNT(*) AS total_intervenciones
        {INTERVENTION_FROM}
        WHERE {where}
        GROUP BY tec.id_usuario, tec.nombre, tec.apellido
        ORDER BY total_intervenciones DESC, tec.apellido, tec.nombre
        """,
        tuple(params), many=True, cursor=cursor,
    )


def list_pending_interventions(filters, technician_id=None, *, limit=100, cursor):
    where, params = build_incident_filters(filters, technician_id)
    return query(
        f"""
        SELECT i.id_incidencia, i.titulo,
               ti.nombre AS tipo_incidencia, p.nombre AS prioridad,
               {CURRENT_STATUS} AS estado, i.fecha_reporte, i.fecha_limite,
               u.codigo AS unidad, ec.nombre AS espacio_comun, ed.nombre AS edificio,
               tecnico.nombre AS tecnico_nombre, tecnico.apellido AS tecnico_apellido
        {INCIDENT_FROM}
        JOIN tipos_incidencia ti ON ti.id_tipo_incidencia = i.id_tipo_incidencia
        JOIN prioridades p ON p.id_prioridad = i.id_prioridad
        LEFT JOIN edificios ed ON ed.id_edificio = COALESCE(u.id_edificio, ec.id_edificio)
        LEFT JOIN usuarios tecnico ON tecnico.id_usuario = asignado.id_personal_asignado
        WHERE {where} AND {PENDING_INTERVENTION}
        ORDER BY i.fecha_reporte ASC, i.id_incidencia
        LIMIT %s
        """,
        tuple(params + [limit]), many=True, cursor=cursor,
    )


def list_interventions(filters, technician_id=None, *, limit=100, cursor):
    where, params = build_intervention_filters(filters, technician_id)
    return query(
        f"""
        SELECT v.id_intervencion, v.fecha_inicio, v.fecha_fin, v.resultado,
               i.id_incidencia, i.titulo AS incidencia_titulo,
               tec.id_usuario AS id_tecnico, tec.nombre AS tecnico_nombre,
               tec.apellido AS tecnico_apellido
        {INTERVENTION_FROM}
        WHERE {where}
        ORDER BY v.fecha_inicio DESC, v.id_intervencion DESC
        LIMIT %s
        """,
        tuple(params + [limit]), many=True, cursor=cursor,
    )
