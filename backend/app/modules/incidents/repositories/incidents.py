from app.core.db_helpers import query

STATUS_ASSIGNMENT_JOINS = """
    LEFT JOIN LATERAL (
        SELECT h.id_estado
        FROM historial_incidencia h
        WHERE h.id_incidencia = i.id_incidencia
        ORDER BY h.version DESC, h.id_historial_incidencia DESC
        LIMIT 1
    ) ultimo ON TRUE
    LEFT JOIN estados_incidencia estado
        ON estado.id_estados_incidencia = ultimo.id_estado
    LEFT JOIN LATERAL (
        SELECT
            a.id_asignacion,
            a.id_personal_asignado,
            a.fecha_asignacion,
            a.notas
        FROM asignaciones a
        WHERE a.id_incidencia = i.id_incidencia
          AND a.activa = TRUE
        ORDER BY a.fecha_asignacion DESC, a.id_asignacion DESC
        LIMIT 1
    ) asignado ON TRUE
"""

INCIDENT_SELECT = """
    SELECT
        i.id_incidencia,
        i.titulo,
        i.descripcion,
        i.fecha_reporte,
        i.fecha_limite,
        i.fecha_resolucion,
        i.created_at,
        i.updated_at,
        i.id_reportante,
        i.id_unidad,
        ti.id_tipo_incidencia,
        ti.nombre AS tipo_incidencia,
        p.id_prioridad,
        p.nombre AS prioridad,
        p.nivel AS nivel_prioridad,
        p.tiempo_resolucion_horas,
        u.codigo AS unidad,
        e.nombre AS edificio,
        reportante.nombre AS residente_nombre,
        reportante.apellido AS residente_apellido,
        reportante.email AS residente_email,
        reportante.telefono AS residente_telefono,
        COALESCE(estado.nombre, 'SIN ESTADO') AS estado,
        COALESCE(estado.id_estados_incidencia, 0) AS id_estado,
        asignado.id_asignacion,
        asignado.id_personal_asignado,
        tecnico.nombre AS tecnico_nombre,
        tecnico.apellido AS tecnico_apellido,
        tecnico.email AS tecnico_email,
        asignado.fecha_asignacion,
        asignado.notas AS notas_asignacion
    FROM incidencias i
    JOIN tipos_incidencia ti
        ON ti.id_tipo_incidencia = i.id_tipo_incidencia
    JOIN prioridades p
        ON p.id_prioridad = i.id_prioridad
    LEFT JOIN unidades u
        ON u.id_unidad = i.id_unidad
    LEFT JOIN edificios e
        ON e.id_edificio = u.id_edificio
    LEFT JOIN usuarios reportante
        ON reportante.id_usuario = i.id_reportante
""" + STATUS_ASSIGNMENT_JOINS + """
    LEFT JOIN usuarios tecnico
        ON tecnico.id_usuario = asignado.id_personal_asignado
"""

def list_incidents(*, reporter_id=None, technician_id=None, cursor=None,):
    statement = INCIDENT_SELECT
    conditions = []
    params = []

    if reporter_id is not None:
        conditions.append("i.id_reportante = %s")
        params.append(reporter_id)

    if technician_id is not None:
        conditions.append("asignado.id_personal_asignado = %s")
        params.append(technician_id)

    if conditions:
        statement += " WHERE " + " AND ".join(conditions)

    statement += " ORDER BY i.id_incidencia DESC"

    return query(statement, tuple(params), many=True, cursor=cursor)

def get_incident(incident_id, *, cursor):
    return query(INCIDENT_SELECT + " WHERE i.id_incidencia = %s", (incident_id,), cursor=cursor)

def get_context(incident_id, *, cursor):
    return query(
        """
        SELECT
            i.id_incidencia,
            i.id_reportante,
            estado.nombre AS estado,
            asignado.id_personal_asignado
        FROM incidencias i
        """
        + STATUS_ASSIGNMENT_JOINS
        + " WHERE i.id_incidencia = %s",
        (incident_id,),
        cursor=cursor,
    )

def lock_incident(incident_id, *, for_update=False, cursor):
    statement = """
        SELECT id_incidencia
        FROM incidencias
        WHERE id_incidencia = %s
    """

    statement += " FOR UPDATE" if for_update else " FOR SHARE"

    return query(statement, (incident_id,), cursor=cursor)

def get_resident_link(user_id, unit_id, *, cursor):
    return query(
        """
        SELECT id_residente
        FROM residentes
        WHERE id_usuario = %s
          AND id_unidad = %s
        LIMIT 1
        FOR SHARE;
        """,
        (user_id, unit_id),
        cursor=cursor,
    )

def insert_incident(data, user_id, priority, *, cursor):
    return query(
        """
        INSERT INTO incidencias (
            titulo,
            descripcion,
            id_unidad,
            id_tipo_incidencia,
            id_prioridad,
            id_reportante,
            fecha_limite
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            CURRENT_TIMESTAMP + (%s * INTERVAL '1 hour')
        )
        RETURNING id_incidencia;
        """,
        (
            data["titulo"],
            data["descripcion"],
            data["id_unidad"],
            data["id_tipo_incidencia"],
            priority["id_prioridad"],
            user_id,
            priority["tiempo_resolucion_horas"],
        ),
        cursor=cursor,
    )

def update_priority(incident_id, priority, *, cursor):
    query(
        """
        UPDATE incidencias
        SET id_prioridad = %s,
            fecha_limite = fecha_reporte + (%s * INTERVAL '1 hour'),
            updated_at = CURRENT_TIMESTAMP
        WHERE id_incidencia = %s;
        """,
        (priority["id_prioridad"], priority["tiempo_resolucion_horas"], incident_id,),
        cursor=cursor,
    )

def touch_incident(incident_id, *, cursor):
    query(
        """
        UPDATE incidencias
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id_incidencia = %s;
        """,
        (incident_id,),
        cursor=cursor,
    )

def update_resolution_date(incident_id, previous_status, new_status, *, cursor):
    query(
        """
        UPDATE incidencias
        SET fecha_resolucion = CASE
                WHEN %s IN ('RESUELTA', 'CERRADA')
                    THEN COALESCE(fecha_resolucion, CURRENT_TIMESTAMP)
                WHEN %s IN ('RESUELTA', 'CERRADA')
                     AND %s = 'EN_PROCESO'
                    THEN NULL
                ELSE fecha_resolucion
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_incidencia = %s;
        """,
        (new_status, previous_status, new_status, incident_id,),
        cursor=cursor,
    )