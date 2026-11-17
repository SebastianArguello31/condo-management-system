# Acceso SQL a unidades habitacionales y sus tipos.
# Encapsula las consultas usadas por los servicios de este módulo.
from app.core.db_helpers import delete_record, query, update_record

UNIT_SELECT = """
    SELECT
        u.id_unidad,
        u.codigo,
        u.piso,
        u.created_at,
        u.id_edificio,
        e.nombre AS edificio,
        u.id_tipo_unidad,
        tu.nombre AS tipo_unidad
    FROM unidades u
    JOIN edificios e
        ON e.id_edificio = u.id_edificio
    JOIN tipo_unidad tu
        ON tu.id_tipo_unidad = u.id_tipo_unidad
"""

def list_units():
    return query(UNIT_SELECT + " ORDER BY u.id_unidad", many=True)

def get_unit(unit_id):
    return query(UNIT_SELECT + " WHERE u.id_unidad = %s", (unit_id,))

def list_types():
    return query(
        """
            SELECT id_tipo_unidad, nombre, descripcion
            FROM tipo_unidad
            ORDER BY id_tipo_unidad;
        """,
        many=True,
    )

def get_type(type_id):
    return query(
        """
            SELECT id_tipo_unidad, nombre, descripcion
            FROM tipo_unidad
            WHERE id_tipo_unidad = %s;
        """,
        (type_id,),
    )

def insert_type(data):
    return query(
        """
            INSERT INTO tipo_unidad (nombre, descripcion)
            VALUES (%s, %s)
            RETURNING id_tipo_unidad, nombre, descripcion;
        """,
        (data["nombre"], data.get("descripcion", "")),
    )

def update_type(type_id, data):
    updated = update_record(
        "tipo_unidad",
        "id_tipo_unidad",
        type_id,
        data,
        {"nombre", "descripcion"},
    )

    if updated is None:
        return None

    return get_type(type_id)

def delete_type(type_id):
    return delete_record("tipo_unidad", "id_tipo_unidad", type_id)

def insert_unit(data):
    return query(
        """
            INSERT INTO unidades (
                codigo,
                piso,
                created_at,
                id_edificio,
                id_tipo_unidad
            )
            VALUES (%s, %s, CURRENT_TIMESTAMP, %s, %s)
            RETURNING
                id_unidad,
                codigo,
                piso,
                created_at,
                id_edificio,
                id_tipo_unidad;
        """,
        (data["codigo"], data.get("piso"), data["id_edificio"], data["id_tipo_unidad"],),
    )

def update_unit(unit_id, data):
    return update_record(
        "unidades",
        "id_unidad",
        unit_id,
        data,
        {"codigo", "piso", "id_edificio", "id_tipo_unidad"},
    )

def delete_unit(unit_id):
    return delete_record("unidades", "id_unidad", unit_id)
