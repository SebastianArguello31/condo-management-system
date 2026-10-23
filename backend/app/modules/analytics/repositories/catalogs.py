from app.core.db_helpers import query


def list_buildings(*, cursor):
    return query(
        "SELECT id_edificio, nombre FROM edificios ORDER BY nombre, id_edificio",
        many=True, cursor=cursor,
    )


def list_types(*, cursor):
    return query(
        """
        SELECT id_tipo_incidencia, nombre
        FROM tipos_incidencia
        WHERE activo = TRUE
        ORDER BY nombre, id_tipo_incidencia
        """,
        many=True, cursor=cursor,
    )


def list_priorities(*, cursor):
    return query(
        """
        SELECT id_prioridad, nombre, nivel
        FROM prioridades
        WHERE activo = TRUE
        ORDER BY nivel DESC, id_prioridad
        """,
        many=True, cursor=cursor,
    )


def list_technicians(*, cursor):
    # Solo nombre: el panel no necesita exponer correo ni teléfono.
    return query(
        """
        SELECT u.id_usuario, u.nombre, u.apellido
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE r.nombre = 'TECNICO' AND u.activo = TRUE
        ORDER BY u.apellido, u.nombre, u.id_usuario
        """,
        many=True, cursor=cursor,
    )
