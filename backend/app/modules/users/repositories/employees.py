"""Consultas SQL de empleados."""

from app.core.db_helpers import query

def find_employees(user_id=None, *, cursor=None):
    statement = """
        SELECT
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.activo,
            u.created_at,
            u.id_rol,
            r.nombre AS rol,
            ARRAY(
                SELECT ue.id_especialidad
                FROM usuario_especialidades ue
                WHERE ue.id_usuario = u.id_usuario
                ORDER BY ue.id_especialidad
            ) AS especialidad_ids,
            COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id_especialidad', e.id_especialidad,
                        'nombre', e.nombre,
                        'descripcion', e.descripcion,
                        'activo', e.activo
                    )
                    ORDER BY e.nombre, e.id_especialidad
                )
                FROM usuario_especialidades ue
                JOIN especialidades e USING (id_especialidad)
                WHERE ue.id_usuario = u.id_usuario
            ), '[]'::json) AS especialidades
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE r.nombre = 'TECNICO'
    """

    params = ()

    if user_id is not None:
        statement += " AND u.id_usuario = %s"
        params = (user_id,)

    statement += " ORDER BY u.apellido, u.nombre, u.id_usuario"

    return query(statement, params, many=True, cursor=cursor)