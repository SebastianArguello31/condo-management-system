from app.core.database import get_connection, get_cursor
from app.core.db_helpers import delete_record, query, update_record

def get_all_buildings():
    connection = get_connection()
    cursor = get_cursor(connection)

    try:
        cursor.execute("""
            SELECT e.id_edificio, e.nombre, e.direccion, e.created_at, e.id_tipo_edificio, te.nombre AS tipo_edificio
            FROM edificios e
            JOIN tipo_edificio te
                ON te.id_tipo_edificio = e.id_tipo_edificio
            ORDER BY e.id_edificio;
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()

def get_building_by_id(building_id):
    connection = get_connection()
    cursor = get_cursor(connection)

    try:
        cursor.execute("""
            SELECT e.id_edificio, e.nombre, e.direccion, e.created_at, e.id_tipo_edificio, te.nombre AS tipo_edificio
            FROM edificios e
            JOIN tipo_edificio te
                ON te.id_tipo_edificio = e.id_tipo_edificio
            WHERE e.id_edificio = %s;
        """, (building_id,))

        return cursor.fetchone()

    finally:
        cursor.close()
        connection.close()

def create_building(nombre, direccion, id_tipo_edificio):
    connection = get_connection()
    cursor = get_cursor(connection)

    try:
        cursor.execute("""
            INSERT INTO edificios (nombre, direccion, created_at, id_tipo_edificio)
            VALUES (%s, %s, CURRENT_TIMESTAMP, %s )
            RETURNING id_edificio, nombre, direccion, created_at, id_tipo_edificio;
        """, (nombre, direccion, id_tipo_edificio))

        building = cursor.fetchone()

        connection.commit()

        return building

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

def get_building_types():
    return query("""
        SELECT id_tipo_edificio, nombre
        FROM tipo_edificio
        ORDER BY id_tipo_edificio;
    """, many=True)

def update_building(building_id, data):
    return update_record(
        "edificios",
        "id_edificio",
        building_id,
        data,
        {"nombre", "direccion", "id_tipo_edificio"},
    )

def delete_building(building_id):
    return delete_record("edificios", "id_edificio", building_id)

def get_all_units():
    connection = get_connection()
    cursor = get_cursor(connection)

    try:
        cursor.execute("""
            SELECT u.id_unidad, u.codigo, u.piso, u.created_at, u.id_edificio, e.nombre AS edificio, u.id_tipo_unidad, tu.nombre AS tipo_unidad
            FROM unidades u
            JOIN edificios e
                ON e.id_edificio = u.id_edificio
            JOIN tipo_unidad tu
                ON tu.id_tipo_unidad = u.id_tipo_unidad
            ORDER BY u.id_unidad;
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()

def get_unit_by_id(unit_id):
    connection = get_connection()
    cursor = get_cursor(connection)

    try:
        cursor.execute("""
            SELECT u.id_unidad, u.codigo, u.piso, u.created_at, u.id_edificio, e.nombre AS edificio, u.id_tipo_unidad, tu.nombre AS tipo_unidad
            FROM unidades u
            JOIN edificios e
                ON e.id_edificio = u.id_edificio
            JOIN tipo_unidad tu
                ON tu.id_tipo_unidad = u.id_tipo_unidad
            WHERE u.id_unidad = %s;
        """, (unit_id,))

        return cursor.fetchone()

    finally:
        cursor.close()
        connection.close()

def create_unit(codigo, piso, id_edificio, id_tipo_unidad):
    connection = get_connection()
    cursor = get_cursor(connection)

    try:
        cursor.execute("""
            INSERT INTO unidades (codigo, piso, created_at, id_edificio, id_tipo_unidad)
            VALUES (%s, %s, CURRENT_TIMESTAMP, %s, %s)
            RETURNING id_unidad, codigo, piso, created_at, id_edificio, id_tipo_unidad;
        """, (codigo, piso, id_edificio, id_tipo_unidad))

        unit = cursor.fetchone()

        connection.commit()

        return unit

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

def get_unit_types():
    return query("""
        SELECT id_tipo_unidad, nombre
        FROM tipo_unidad
        ORDER BY id_tipo_unidad;
    """, many=True)

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