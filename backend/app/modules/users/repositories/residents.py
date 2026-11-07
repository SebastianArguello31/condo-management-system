"""Consultas SQL de residentes."""

from app.core.db_helpers import query

def find_residents(user_id=None, *, cursor=None):
    statement = """
        SELECT
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.activo,
            u.created_at,
            r.nombre AS rol,
            res.id_residente,
            un.id_unidad,
            un.codigo AS unidad,
            un.piso,
            e.id_edificio,
            e.nombre AS edificio,
            tu.nombre AS tipo_unidad
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        LEFT JOIN residentes res ON res.id_usuario = u.id_usuario
        LEFT JOIN unidades un ON un.id_unidad = res.id_unidad
        LEFT JOIN edificios e ON e.id_edificio = un.id_edificio
        LEFT JOIN tipo_unidad tu ON tu.id_tipo_unidad = un.id_tipo_unidad
        WHERE r.nombre = 'RESIDENTE'
    """

    params = ()

    if user_id is not None:
        statement += " AND u.id_usuario = %s"
        params = (user_id,)

    statement += """
        ORDER BY
            u.apellido,
            u.nombre,
            u.id_usuario,
            un.codigo NULLS LAST,
            un.id_unidad
    """

    return query(statement, params, many=True, cursor=cursor)

def get_unit_for_link(unit_id, *, cursor):
    return query(
        """
        SELECT id_unidad
        FROM unidades
        WHERE id_unidad = %s
        FOR KEY SHARE;
        """,
        (unit_id,),
        cursor=cursor,
    )

def add_resident_unit(user_id, unit_id, *, cursor):
    return query(
        """
        INSERT INTO residentes (id_usuario, id_unidad)
        VALUES (%s, %s)
        ON CONFLICT ON CONSTRAINT uq_residentes_usuario_unidad
        DO NOTHING
        RETURNING id_residente;
        """,
        (user_id, unit_id),
        cursor=cursor,
    )

def remove_resident_unit(user_id, unit_id, *, cursor):
    return query(
        """
        DELETE FROM residentes
        WHERE id_usuario = %s AND id_unidad = %s
        RETURNING id_residente;
        """,
        (user_id, unit_id),
        cursor=cursor,
    )

def find_resident_units(user_id, *, cursor=None):
    return query(
        """
        SELECT
            res.id_residente,
            un.id_unidad,
            un.codigo,
            un.codigo AS unidad,
            un.piso,
            e.id_edificio,
            e.nombre AS edificio,
            tu.nombre AS tipo_unidad
        FROM residentes res
        JOIN unidades un ON un.id_unidad = res.id_unidad
        JOIN edificios e ON e.id_edificio = un.id_edificio
        JOIN tipo_unidad tu ON tu.id_tipo_unidad = un.id_tipo_unidad
        WHERE res.id_usuario = %s
        ORDER BY e.nombre, un.codigo, un.id_unidad;
        """,
        (user_id,),
        many=True,
        cursor=cursor,
    )