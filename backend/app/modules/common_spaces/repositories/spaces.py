from app.core.db_helpers import query, update_record

SPACE_SELECT = """
    SELECT
        ec.id_espacio_comun,
        ec.nombre,
        ec.descripcion,
        ec.capacidad,
        ec.activo,
        ec.id_edificio,
        e.nombre AS edificio
    FROM espacios_comunes ec
    JOIN edificios e ON e.id_edificio = ec.id_edificio
"""

def list_spaces(*, include_inactive=False):
    statement = SPACE_SELECT

    if not include_inactive:
        statement += " WHERE ec.activo = TRUE"

    statement += " ORDER BY ec.id_espacio_comun"

    return query(statement, many=True)

def get_space(space_id, *, cursor=None):
    return query(SPACE_SELECT + " WHERE ec.id_espacio_comun = %s", (space_id,), cursor=cursor)

def lock_space(space_id, *, cursor):
    return query(
        """
        SELECT id_espacio_comun, capacidad, activo
        FROM espacios_comunes
        WHERE id_espacio_comun = %s
        FOR UPDATE;
        """,
        (space_id,),
        cursor=cursor,
    )

def insert_space(data, *, cursor):
    return query(
        """
        INSERT INTO espacios_comunes (
            nombre,
            descripcion,
            capacidad,
            id_edificio
        )
        VALUES (%s, %s, %s, %s)
        RETURNING id_espacio_comun;
        """,
        (data["nombre"], data.get("descripcion"), data["capacidad"], data["id_edificio"],),
        cursor=cursor,
    )

def update_space(space_id, data, *, cursor):
    return update_record(
        "espacios_comunes",
        "id_espacio_comun",
        space_id,
        data,
        {"nombre", "descripcion", "capacidad", "id_edificio", "activo"},
        cursor=cursor,
    )