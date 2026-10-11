from app.core.db_helpers import query

def list_priorities(*, cursor=None):
    return query(
        """
        SELECT
            id_prioridad,
            nombre,
            nivel,
            tiempo_resolucion_horas
        FROM prioridades
        WHERE activo = TRUE
        ORDER BY nivel, id_prioridad;
        """,
        many=True,
        cursor=cursor,
    )

def list_statuses(*, cursor=None):
    return query(
        """
        SELECT
            id_estados_incidencia AS id_estado,
            nombre,
            descripcion
        FROM estados_incidencia
        ORDER BY id_estados_incidencia;
        """,
        many=True,
        cursor=cursor,
    )

def list_technicians(*, cursor=None):
    return query(
        """
        SELECT
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.activo,
            COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id_especialidad', e.id_especialidad,
                        'nombre', e.nombre
                    )
                    ORDER BY e.nombre
                )
                FROM usuario_especialidades ue
                JOIN especialidades e USING (id_especialidad)
                WHERE ue.id_usuario = u.id_usuario
                  AND e.activo = TRUE
            ), '[]'::json) AS especialidades
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE r.nombre = 'TECNICO'
          AND u.activo = TRUE
        ORDER BY u.apellido, u.nombre, u.id_usuario;
        """,
        many=True,
        cursor=cursor,
    )

def list_types(*, cursor):
    return query(
        """
        SELECT id_tipo_incidencia, nombre
        FROM tipos_incidencia
        WHERE activo = TRUE
        ORDER BY nombre, id_tipo_incidencia;
        """,
        many=True,
        cursor=cursor,
    )

def list_resident_units(user_id, *, cursor):
    return query(
        """
        SELECT DISTINCT
            u.id_unidad,
            u.codigo,
            e.nombre AS edificio
        FROM residentes r
        JOIN unidades u ON u.id_unidad = r.id_unidad
        JOIN edificios e ON e.id_edificio = u.id_edificio
        WHERE r.id_usuario = %s
        ORDER BY e.nombre, u.codigo;
        """,
        (user_id,),
        many=True,
        cursor=cursor,
    )

def get_active_type(type_id, *, cursor):
    return query(
        """
        SELECT id_tipo_incidencia
        FROM tipos_incidencia
        WHERE id_tipo_incidencia = %s
          AND activo = TRUE
        FOR SHARE;
        """,
        (type_id,),
        cursor=cursor,
    )

def get_priority(priority_id=None, *, cursor):
    if priority_id is None:
        return query(
            """
            SELECT id_prioridad, tiempo_resolucion_horas
            FROM prioridades
            WHERE nombre = 'Normal'
              AND activo = TRUE
            ORDER BY id_prioridad
            LIMIT 1
            FOR SHARE;
            """,
            cursor=cursor,
        )

    return query(
        """
        SELECT id_prioridad, tiempo_resolucion_horas
        FROM prioridades
        WHERE id_prioridad = %s
          AND activo = TRUE
        FOR SHARE;
        """,
        (priority_id,),
        cursor=cursor,
    )

def get_status(*, status_id=None, name=None, cursor):
    if status_id is not None:
        return query(
            """
            SELECT id_estados_incidencia, nombre
            FROM estados_incidencia
            WHERE id_estados_incidencia = %s
            FOR SHARE;
            """,
            (status_id,),
            cursor=cursor,
        )

    return query(
        """
        SELECT id_estados_incidencia, nombre
        FROM estados_incidencia
        WHERE UPPER(nombre) = UPPER(%s)
        ORDER BY id_estados_incidencia
        LIMIT 1
        FOR SHARE;
        """,
        (name,),
        cursor=cursor,
    )

def get_staff(user_id, *, cursor):
    return query(
        """
        SELECT u.id_usuario, u.activo, r.nombre AS rol
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = %s
        FOR SHARE OF u, r;
        """,
        (user_id,),
        cursor=cursor,
    )