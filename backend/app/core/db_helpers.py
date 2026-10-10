from contextlib import contextmanager
from psycopg2 import sql
from werkzeug.exceptions import BadRequest

from app.core.database import get_connection, get_cursor

@contextmanager
def transaction():
    connection = get_connection()

    try:
        with connection:
            with get_cursor(connection) as cursor:
                yield cursor
    finally:
        connection.close()

def _execute(cursor, statement, params, many):
    cursor.execute(statement, params)

    if cursor.description is None:
        return None

    if many:
        return cursor.fetchall()

    return cursor.fetchone()

def query(statement, params=(), *, many=False, cursor=None):
    if cursor is not None:
        return _execute(cursor, statement, params, many)

    with transaction() as new_cursor:
        return _execute(new_cursor, statement, params, many)

def update_record(table, primary_key, record_id, data, allowed_fields, *, cursor=None,):
    if not data:
        raise BadRequest("Debes indicar los campos que deseas actualizar")

    for field in data:
        if field not in allowed_fields:
            raise BadRequest(f"Campo no permitido: {field}")

    assignments = []

    for field in data:
        assignment = sql.SQL("{} = %s").format(sql.Identifier(field))
        assignments.append(assignment)

    statement = sql.SQL(
        "UPDATE {table} "
        "SET {assignments} "
        "WHERE {primary_key} = %s "
        "RETURNING {primary_key}"
    ).format(
        table=sql.Identifier(table),
        assignments=sql.SQL(", ").join(assignments),
        primary_key=sql.Identifier(primary_key),
    )

    params = list(data.values())
    params.append(record_id)

    return query(statement, params, cursor=cursor)

def delete_record(table, primary_key, record_id, *, cursor=None):
    statement = sql.SQL(
        "DELETE FROM {table} "
        "WHERE {primary_key} = %s "
        "RETURNING {primary_key}"
    ).format(
        table=sql.Identifier(table),
        primary_key=sql.Identifier(primary_key),
    )

    return query(statement, (record_id,), cursor=cursor)