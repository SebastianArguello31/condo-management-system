"""Consultas SQL de especialidades."""

from app.core.db_helpers import query, update_record, delete_record

def find_specialties(user_id=None, *, cursor=None):
    statement = """
        SELECT e.id_especialidad, e.nombre, e.descripcion, e.activo
        FROM especialidades e
    """
    params = ()

    if user_id is not None:
        statement += """
            JOIN usuario_especialidades ue
                ON ue.id_especialidad = e.id_especialidad
            WHERE ue.id_usuario = %s
        """
        params = (user_id,)

    statement += " ORDER BY e.nombre, e.id_especialidad"

    return query(statement, params, many=True, cursor=cursor)

def lock_specialties(ids, *, cursor):
    return query(
        """
        SELECT id_especialidad, nombre, descripcion, activo
        FROM especialidades
        WHERE id_especialidad = ANY(%s)
        ORDER BY id_especialidad
        FOR SHARE;
        """,
        (sorted(set(ids)),),
        many=True,
        cursor=cursor,
    )

def insert_specialty(data, *, cursor):
    return query(
        """
        INSERT INTO especialidades (nombre, descripcion, activo)
        VALUES (%s, %s, %s)
        RETURNING id_especialidad, nombre, descripcion, activo;
        """,
        (data["nombre"], data.get("descripcion", ""), data.get("activo", True),),
        cursor=cursor,
    )

def update_specialty(specialty_id, data, *, cursor):
    row = update_record(
        "especialidades",
        "id_especialidad",
        specialty_id,
        data,
        {"nombre", "descripcion", "activo"},
        cursor=cursor,
    )

    if row is None:
        return None

    return query(
        """
        SELECT id_especialidad, nombre, descripcion, activo
        FROM especialidades
        WHERE id_especialidad = %s;
        """,
        (specialty_id,),
        cursor=cursor,
    )

def delete_specialty(specialty_id, *, cursor):
    return delete_record("especialidades", "id_especialidad", specialty_id, cursor=cursor)

def replace_user_specialties(user_id, ids, *, cursor):
    query("DELETE FROM usuario_especialidades WHERE id_usuario = %s", (user_id,), cursor=cursor)

    cursor.executemany(
        """
        INSERT INTO usuario_especialidades (
            id_usuario, id_especialidad
        )
        VALUES (%s, %s);
        """,
        [
            (user_id, item_id)
            for item_id in sorted(set(ids))
        ],
    )

def add_user_specialty(user_id, specialty_id, *, cursor):
    return query(
        """
        INSERT INTO usuario_especialidades (
            id_usuario, id_especialidad
        )
        VALUES (%s, %s)
        ON CONFLICT (id_usuario, id_especialidad) DO NOTHING
        RETURNING id_especialidad;
        """,
        (user_id, specialty_id),
        cursor=cursor,
    )

def remove_user_specialty(user_id, specialty_id, *, cursor):
    return query(
        """
        DELETE FROM usuario_especialidades
        WHERE id_usuario = %s AND id_especialidad = %s
        RETURNING id_especialidad;
        """,
        (user_id, specialty_id),
        cursor=cursor,
    )