from app.core.db_helpers import query, transaction, update_record

ESPACIO_SELECT = """
    SELECT
        ec.id_espacio_comun,
        ec.nombre,
        ec.descripcion,
        ec.capacidad,
        ec.activo,
        ec.id_edificio,
        e.nombre AS edificio
    FROM espacios_comunes ec
    JOIN edificios e
        ON e.id_edificio = ec.id_edificio
"""

def list_espacios(rol):
    statement = ESPACIO_SELECT

    if rol != "ADMIN":
        statement += " WHERE ec.activo = TRUE"

    statement += " ORDER BY ec.id_espacio_comun;"

    return query(statement, many=True)

def get_espacio(espacio_id):
    return query(
        ESPACIO_SELECT + " WHERE ec.id_espacio_comun = %s;",
        (espacio_id,),
    )

def create_espacio(data):
    with transaction() as cursor:
        cursor.execute("""
            INSERT INTO espacios_comunes (
                nombre, descripcion, capacidad, id_edificio
            )
            VALUES (%s, %s, %s, %s)
            RETURNING id_espacio_comun;
        """, (
            data["nombre"],
            data.get("descripcion"),
            data["capacidad"],
            data["id_edificio"],
        ))

        espacio_id = cursor.fetchone()["id_espacio_comun"]

    return get_espacio(espacio_id)

def update_espacio(espacio_id, data):
    return update_record(
        "espacios_comunes",
        "id_espacio_comun",
        espacio_id,
        data,
        {"nombre", "descripcion", "capacidad", "activo"},
    )
