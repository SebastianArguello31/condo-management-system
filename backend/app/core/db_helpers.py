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

def query(statement, params=(), *, many=False):
    with transaction() as cursor:
        cursor.execute(statement, params)

        if many:
            return cursor.fetchall()

        return cursor.fetchone()

def update_record(table, pk, record_id, data, allowed_fields):
    if not data or not set(data).issubset(allowed_fields):
        raise BadRequest("Campos de actualización inválidos")

    assignments = sql.SQL(", ").join(
        sql.SQL("{} = %s").format(sql.Identifier(field))
        for field in data
    )

    statement = sql.SQL("""
        UPDATE {}
        SET {}
        WHERE {} = %s
        RETURNING {};
    """).format(
        sql.Identifier(table),
        assignments,
        sql.Identifier(pk),
        sql.Identifier(pk),
    )

    return query(statement, (*data.values(), record_id))

def delete_record(table, pk, record_id):
    statement = sql.SQL("""
        DELETE FROM {}
        WHERE {} = %s
        RETURNING {};
    """).format(
        sql.Identifier(table),
        sql.Identifier(pk),
        sql.Identifier(pk),
    )

    return query(statement, (record_id,))
