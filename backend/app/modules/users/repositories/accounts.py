"""Consultas SQL de cuentas."""

from app.core.db_helpers import query, update_record, delete_record

USER_SELECT = """
    SELECT
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.activo,
        u.created_at,
        u.id_rol,
        r.nombre AS rol
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.id_rol
"""

def list_users(role=None, *, cursor=None):
    statement = USER_SELECT
    params = ()

    if role is not None:
        statement += " WHERE r.nombre = %s"
        params = (role,)

    statement += " ORDER BY u.apellido, u.nombre, u.id_usuario"

    return query(statement, params, many=True, cursor=cursor)

def get_user(user_id, *, cursor=None):
    return query(USER_SELECT + " WHERE u.id_usuario = %s", (user_id,), cursor=cursor)

def get_login_user(email):
    return query(
        """
        SELECT
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.password_hash,
            u.activo,
            u.id_rol,
            r.nombre AS rol
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE lower(btrim(u.email)) = lower(btrim(%s));
        """,
        (email,),
    )

def get_roles():
    return query("SELECT id_rol, nombre FROM roles ORDER BY nombre", many=True)

def find_role(name, *, cursor):
    return query("SELECT id_rol, nombre FROM roles WHERE nombre = %s", (name,), cursor=cursor)

def lock_users(ids, *, cursor):
    ids = sorted(set(ids))

    if not ids:
        return {}

    rows = query(
        USER_SELECT + """
            WHERE u.id_usuario = ANY(%s)
            ORDER BY u.id_usuario
            FOR UPDATE OF u;
        """,
        (ids,),
        many=True,
        cursor=cursor,
    )

    return {
        row["id_usuario"]: row
        for row in rows
    }

def insert_user(data, role_id, *, cursor):
    row = query(
        """
        INSERT INTO usuarios (
            nombre, apellido, email, telefono,
            password_hash, activo, id_rol
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id_usuario;
        """,
        (
            data["nombre"],
            data["apellido"],
            data["email"],
            data["telefono"],
            data["password_hash"],
            data.get("activo", True),
            role_id,
        ),
        cursor=cursor,
    )

    return get_user(row["id_usuario"], cursor=cursor)

def update_user(user_id, data, *, cursor):
    row = update_record(
        "usuarios",
        "id_usuario",
        user_id,
        data,
        {
            "nombre",
            "apellido",
            "email",
            "telefono",
            "password_hash",
            "activo",
        },
        cursor=cursor,
    )

    if row is None:
        return None

    return get_user(user_id, cursor=cursor)

def delete_user(user_id, *, cursor):
    query("DELETE FROM usuario_especialidades WHERE id_usuario = %s", (user_id,), cursor=cursor)

    query("DELETE FROM usuario_cargos WHERE id_usuario = %s", (user_id,), cursor=cursor)

    return delete_record("usuarios", "id_usuario", user_id, cursor=cursor)