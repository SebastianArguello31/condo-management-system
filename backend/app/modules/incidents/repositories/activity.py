from app.core.db_helpers import query

def record_status(incident_id, status_id, user_id, comment=None, *, cursor):
    query(
        """
        INSERT INTO historial_incidencia (
            fecha,
            version,
            id_estado,
            id_incidencia,
            id_usuario,
            comentario
        )
        SELECT
            CURRENT_TIMESTAMP,
            COALESCE(MAX(version), 0) + 1,
            %s,
            %s,
            %s,
            %s
        FROM historial_incidencia
        WHERE id_incidencia = %s;
        """,
        (status_id, incident_id, user_id, comment, incident_id,),
        cursor=cursor,
    )

def list_history(incident_id, *, cursor):
    return query(
        """
        SELECT
            h.id_historial_incidencia,
            h.fecha,
            h.version,
            h.comentario,
            e.id_estados_incidencia AS id_estado,
            e.nombre AS estado,
            e.descripcion AS estado_descripcion,
            u.id_usuario,
            u.nombre AS usuario_nombre,
            u.apellido AS usuario_apellido,
            r.nombre AS usuario_rol
        FROM historial_incidencia h
        JOIN estados_incidencia e
            ON e.id_estados_incidencia = h.id_estado
        JOIN usuarios u ON u.id_usuario = h.id_usuario
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE h.id_incidencia = %s
        ORDER BY h.version, h.fecha, h.id_historial_incidencia;
        """,
        (incident_id,),
        many=True,
        cursor=cursor,
    )

def list_assignments(incident_id, *, cursor):
    return query(
        """
        SELECT
            a.id_asignacion,
            a.fecha_asignacion,
            a.activa,
            a.notas,
            u.id_usuario AS id_personal_asignado,
            u.nombre AS tecnico_nombre,
            u.apellido AS tecnico_apellido,
            u.email AS tecnico_email,
            u.telefono AS tecnico_telefono
        FROM asignaciones a
        JOIN usuarios u ON u.id_usuario = a.id_personal_asignado
        WHERE a.id_incidencia = %s
        ORDER BY a.fecha_asignacion DESC, a.id_asignacion DESC;
        """,
        (incident_id,),
        many=True,
        cursor=cursor,
    )

def replace_assignment(incident_id, technician_id, notes, *, cursor):
    query(
        """
        UPDATE asignaciones
        SET activa = FALSE
        WHERE id_incidencia = %s
          AND activa = TRUE;
        """,
        (incident_id,),
        cursor=cursor,
    )

    query(
        """
        INSERT INTO asignaciones (
            id_incidencia,
            id_personal_asignado,
            fecha_asignacion,
            activa,
            notas
        )
        VALUES (%s, %s, CURRENT_TIMESTAMP, TRUE, %s);
        """,
        (incident_id, technician_id, notes),
        cursor=cursor,
    )

def list_interventions(incident_id, *, cursor):
    return query(
        """
        SELECT
            v.id_intervencion,
            v.fecha_inicio,
            v.fecha_fin,
            v.resultado,
            v.id_personal,
            u.nombre AS tecnico_nombre,
            u.apellido AS tecnico_apellido
        FROM intervenciones v
        JOIN usuarios u ON u.id_usuario = v.id_personal
        WHERE v.id_incidencia = %s
        ORDER BY v.fecha_inicio DESC, v.id_intervencion DESC;
        """,
        (incident_id,),
        many=True,
        cursor=cursor,
    )

def insert_intervention(incident_id, user_id, result, *, cursor):
    return query(
        """
        INSERT INTO intervenciones (
            fecha_inicio,
            fecha_fin,
            resultado,
            created_at,
            id_incidencia,
            id_personal
        )
        VALUES (
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            %s,
            CURRENT_TIMESTAMP,
            %s,
            %s
        )
        RETURNING
            id_intervencion,
            fecha_inicio,
            fecha_fin,
            resultado,
            id_personal;
        """,
        (result, incident_id, user_id),
        cursor=cursor,
    )