from app.core.db_helpers import delete_record, query, update_record

BUILDING_SELECT = """
    SELECT
        e.id_edificio,
        e.nombre,
        e.direccion,
        e.created_at,
        e.id_tipo_edificio,
        te.nombre AS tipo_edificio
    FROM edificios e
    JOIN tipo_edificio te
        ON te.id_tipo_edificio = e.id_tipo_edificio
"""

def list_buildings():
    return query(BUILDING_SELECT + " ORDER BY e.id_edificio", many=True)

def get_building(building_id):
    return query(BUILDING_SELECT + " WHERE e.id_edificio = %s", (building_id,))

def list_types():
    return query(
        """
        SELECT id_tipo_edificio, nombre
        FROM tipo_edificio
        ORDER BY id_tipo_edificio;
        """,
        many=True,
    )

def insert_building(data):
    return query(
        """
        INSERT INTO edificios (
            nombre,
            direccion,
            created_at,
            id_tipo_edificio
        )
        VALUES (%s, %s, CURRENT_TIMESTAMP, %s)
        RETURNING
            id_edificio,
            nombre,
            direccion,
            created_at,
            id_tipo_edificio;
        """,
        (data["nombre"], data.get("direccion"), data["id_tipo_edificio"],),
    )

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