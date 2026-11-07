from app.core.db_helpers import query
from app.modules.incidents.repositories.incidents import STATUS_ASSIGNMENT_JOINS

# Se reutilizan los JOIN del módulo de incidencias para que el estado actual y
# el técnico asignado se resuelvan exactamente igual que en el listado operativo.

PENDING_STATUSES = ("RECIBIDA", "EN_REVISION", "ASIGNADA", "EN_PROCESO", "EN_ESPERA")
RESOLVED_STATUSES = ("RESUELTA", "CERRADA")
DISCARDED_STATUSES = ("RECHAZADA", "CANCELADA")

CURRENT_STATUS = "COALESCE(estado.nombre, 'SIN ESTADO')"

INCIDENT_FROM = """
    FROM incidencias i
    LEFT JOIN unidades u ON u.id_unidad = i.id_unidad
    LEFT JOIN espacios_comunes ec ON ec.id_espacio_comun = i.id_espacio_comun
""" + STATUS_ASSIGNMENT_JOINS


def sql_list(values):
    """Convierte constantes internas (nunca datos del usuario) en una lista SQL."""
    return ", ".join(f"'{value}'" for value in values)


def date_range(column, filters):
    """Rango inclusivo por día: [desde 00:00, hasta + 1 día)."""
    conditions, params = [], []
    if filters.get("desde"):
        conditions.append(f"{column} >= %s")
        params.append(filters["desde"])
    if filters.get("hasta"):
        conditions.append(f"{column} < %s::date + 1")
        params.append(filters["hasta"])
    return conditions, params


def build_incident_filters(filters, technician_id=None, *, date_column="i.fecha_reporte"):
    conditions, params = date_range(date_column, filters) if date_column else ([], [])

    if filters.get("id_edificio"):
        # Una incidencia puede pertenecer a una unidad o a un espacio común.
        conditions.append("COALESCE(u.id_edificio, ec.id_edificio) = %s")
        params.append(filters["id_edificio"])

    if filters.get("id_tipo_incidencia"):
        conditions.append("i.id_tipo_incidencia = %s")
        params.append(filters["id_tipo_incidencia"])

    if filters.get("id_prioridad"):
        conditions.append("i.id_prioridad = %s")
        params.append(filters["id_prioridad"])

    if filters.get("id_tecnico"):
        conditions.append("asignado.id_personal_asignado = %s")
        params.append(filters["id_tecnico"])

    # El alcance del técnico se aplica siempre y se combina con AND, por lo que
    # un id_tecnico ajeno no puede ampliar los datos visibles.
    if technician_id is not None:
        conditions.append("asignado.id_personal_asignado = %s")
        params.append(technician_id)

    return " AND ".join(conditions) or "TRUE", params


def get_incident_kpis(filters, technician_id=None, *, cursor):
    where, params = build_incident_filters(filters, technician_id)
    return query(
        f"""
        SELECT
            COUNT(*) AS total_incidencias,
            COUNT(*) FILTER (WHERE {CURRENT_STATUS} IN ({sql_list(PENDING_STATUSES)})) AS incidencias_pendientes,
            COUNT(*) FILTER (WHERE {CURRENT_STATUS} IN ({sql_list(RESOLVED_STATUSES)})) AS incidencias_resueltas,
            COUNT(*) FILTER (WHERE {CURRENT_STATUS} IN ({sql_list(DISCARDED_STATUSES)})) AS incidencias_descartadas,
            ROUND(AVG(
                EXTRACT(EPOCH FROM (i.fecha_resolucion - i.fecha_reporte)) / 3600.0
            ) FILTER (
                WHERE i.fecha_resolucion IS NOT NULL AND i.fecha_resolucion >= i.fecha_reporte
            )::numeric, 1) AS tiempo_promedio_resolucion_horas,
            COUNT(*) FILTER (
                WHERE i.fecha_resolucion IS NOT NULL AND i.fecha_limite IS NOT NULL
                  AND i.fecha_resolucion <= i.fecha_limite
            ) AS resueltas_en_plazo,
            COUNT(*) FILTER (
                WHERE i.fecha_resolucion IS NOT NULL AND i.fecha_limite IS NOT NULL
            ) AS total_con_plazo
        {INCIDENT_FROM}
        WHERE {where}
        """,
        tuple(params), cursor=cursor,
    )


def get_incidents_by_status(filters, technician_id=None, *, cursor):
    where, params = build_incident_filters(filters, technician_id)
    return query(
        f"""
        SELECT {CURRENT_STATUS} AS estado, COUNT(*) AS total
        {INCIDENT_FROM}
        WHERE {where}
        GROUP BY {CURRENT_STATUS}
        ORDER BY total DESC, estado
        """,
        tuple(params), many=True, cursor=cursor,
    )


def get_incidents_by_priority(filters, technician_id=None, *, cursor):
    where, params = build_incident_filters(filters, technician_id)
    return query(
        f"""
        SELECT p.id_prioridad, p.nombre AS prioridad, p.nivel, COUNT(*) AS total
        {INCIDENT_FROM}
        JOIN prioridades p ON p.id_prioridad = i.id_prioridad
        WHERE {where}
        GROUP BY p.id_prioridad, p.nombre, p.nivel
        ORDER BY p.nivel DESC, p.id_prioridad
        """,
        tuple(params), many=True, cursor=cursor,
    )


def get_incidents_by_type(filters, technician_id=None, *, cursor):
    where, params = build_incident_filters(filters, technician_id)
    return query(
        f"""
        SELECT ti.id_tipo_incidencia, ti.nombre AS tipo_incidencia, COUNT(*) AS total
        {INCIDENT_FROM}
        JOIN tipos_incidencia ti ON ti.id_tipo_incidencia = i.id_tipo_incidencia
        WHERE {where}
        GROUP BY ti.id_tipo_incidencia, ti.nombre
        ORDER BY total DESC, ti.nombre
        """,
        tuple(params), many=True, cursor=cursor,
    )


def get_incidents_timeline(filters, technician_id=None, *, cursor):
    """Reportadas por día de reporte y resueltas por día de resolución."""
    base_where, base_params = build_incident_filters(filters, technician_id, date_column=None)
    reported_conds, reported_params = date_range("fecha_reporte", filters)
    resolved_conds, resolved_params = date_range("fecha_resolucion", filters)
    reported_where = " AND ".join(reported_conds) or "TRUE"
    resolved_where = " AND ".join(["fecha_resolucion IS NOT NULL", *resolved_conds])
    return query(
        f"""
        WITH base AS (
            SELECT i.fecha_reporte, i.fecha_resolucion
            {INCIDENT_FROM}
            WHERE {base_where}
        ),
        reportadas AS (
            SELECT fecha_reporte::date AS fecha, COUNT(*) AS total
            FROM base WHERE {reported_where} GROUP BY 1
        ),
        resueltas AS (
            SELECT fecha_resolucion::date AS fecha, COUNT(*) AS total
            FROM base WHERE {resolved_where} GROUP BY 1
        )
        SELECT TO_CHAR(COALESCE(r.fecha, s.fecha), 'YYYY-MM-DD') AS fecha,
               COALESCE(r.total, 0) AS reportadas,
               COALESCE(s.total, 0) AS resueltas
        FROM reportadas r
        FULL OUTER JOIN resueltas s ON s.fecha = r.fecha
        ORDER BY 1
        """,
        tuple(base_params + reported_params + resolved_params), many=True, cursor=cursor,
    )


def get_resolution_times_by_priority(filters, technician_id=None, *, cursor):
    where, params = build_incident_filters(filters, technician_id)
    return query(
        f"""
        SELECT p.id_prioridad, p.nombre AS prioridad, p.nivel,
               p.tiempo_resolucion_horas AS objetivo_horas,
               ROUND(AVG(EXTRACT(EPOCH FROM (i.fecha_resolucion - i.fecha_reporte)) / 3600.0)::numeric, 1)
                   AS horas_promedio,
               COUNT(*) AS total_resueltas
        {INCIDENT_FROM}
        JOIN prioridades p ON p.id_prioridad = i.id_prioridad
        WHERE {where}
          AND i.fecha_resolucion IS NOT NULL
          AND i.fecha_resolucion >= i.fecha_reporte
        GROUP BY p.id_prioridad, p.nombre, p.nivel, p.tiempo_resolucion_horas
        ORDER BY p.nivel DESC, p.id_prioridad
        """,
        tuple(params), many=True, cursor=cursor,
    )


def list_incidents(filters, technician_id=None, *, statuses=None, status=None, limit=100, cursor):
    where, params = build_incident_filters(filters, technician_id)
    if statuses:
        where += f" AND {CURRENT_STATUS} IN ({sql_list(statuses)})"
    if status:
        where += f" AND {CURRENT_STATUS} = %s"
        params.append(status)
    params.append(limit)
    return query(
        f"""
        SELECT i.id_incidencia, i.titulo,
               ti.nombre AS tipo_incidencia, p.nombre AS prioridad,
               {CURRENT_STATUS} AS estado,
               i.fecha_reporte, i.fecha_limite, i.fecha_resolucion,
               u.codigo AS unidad, ec.nombre AS espacio_comun, ed.nombre AS edificio,
               tecnico.nombre AS tecnico_nombre, tecnico.apellido AS tecnico_apellido
        {INCIDENT_FROM}
        JOIN tipos_incidencia ti ON ti.id_tipo_incidencia = i.id_tipo_incidencia
        JOIN prioridades p ON p.id_prioridad = i.id_prioridad
        LEFT JOIN edificios ed ON ed.id_edificio = COALESCE(u.id_edificio, ec.id_edificio)
        LEFT JOIN usuarios tecnico ON tecnico.id_usuario = asignado.id_personal_asignado
        WHERE {where}
        ORDER BY i.fecha_reporte DESC, i.id_incidencia DESC
        LIMIT %s
        """,
        tuple(params), many=True, cursor=cursor,
    )
