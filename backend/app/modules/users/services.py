from psycopg2 import sql
from werkzeug.exceptions import BadRequest, Forbidden, NotFound

from app.core.db_helpers import query, transaction
from app.core.security import hash_password

USER_SELECT = """
    SELECT u.id_usuario, u.nombre, u.apellido, u.email,
           u.telefono, u.activo, u.created_at, u.id_rol,
           r.nombre AS rol
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.id_rol
"""

def get_all_users():
    return query(USER_SELECT + " ORDER BY u.id_usuario;", many=True,)

def get_user_by_id(user_id):
    return query(USER_SELECT + " WHERE u.id_usuario = %s;", (user_id,),)

def get_roles():
    return query("""SELECT id_rol, nombre FROM roles ORDER BY id_rol;""", many=True)

def create_user(nombre, apellido, email, telefono, password, id_rol, activo=True):
    return query("""
        INSERT INTO usuarios (
            nombre, apellido, email, telefono,
            password_hash, id_rol, activo
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id_usuario, nombre, apellido, email,
                  telefono, activo, created_at, id_rol;
    """, (nombre, apellido, email, telefono, hash_password(password), id_rol, activo))

def mutate_user(user_id, actor_id, data=None, *, delete=False):
    changes = dict(data or {})

    allowed = {"nombre", "apellido", "email", "telefono", "password", "id_rol", "activo",}

    if not delete and (not changes or not set(changes).issubset(allowed)):
        raise BadRequest("Campos inválidos")

    if "password" in changes:
        changes["password_hash"] = hash_password(changes.pop("password"))

    with transaction() as cursor:
        cursor.execute("LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE;")

        cursor.execute("""
            SELECT u.id_usuario, u.id_rol, u.activo, r.nombre AS rol
            FROM usuarios u
            JOIN roles r ON r.id_rol = u.id_rol
            WHERE u.id_usuario = %s;
        """, (actor_id,))

        actor = cursor.fetchone()

        if not actor or not actor["activo"] or actor["rol"] != "ADMIN":
            raise Forbidden("Tu usuario ya no tiene permisos")

        if user_id == actor_id:
            if delete:
                raise BadRequest("No puedes eliminar tu propia cuenta")

            if changes.get("activo") is False:
                raise BadRequest("No puedes desactivar tu propia cuenta")

            if (
                "id_rol" in changes
                and changes["id_rol"] != actor["id_rol"]
            ):
                raise BadRequest("No puedes cambiar tu propio rol")

        if delete:
            cursor.execute("""
                DELETE FROM usuarios
                WHERE id_usuario = %s
                RETURNING id_usuario;
            """, (user_id,))
        else:
            assignments = sql.SQL(", ").join(
                sql.SQL("{} = %s").format(sql.Identifier(field))
                for field in changes
            )

            cursor.execute(
                sql.SQL("""
                    UPDATE usuarios
                    SET {}
                    WHERE id_usuario = %s
                    RETURNING id_usuario, nombre, apellido,
                              email, telefono, activo,
                              created_at, id_rol;
                """).format(assignments),
                (*changes.values(), user_id),
            )

        return cursor.fetchone()

def update_user(user_id, data, actor_id):
    return mutate_user(user_id, actor_id, data)

def delete_user(user_id, actor_id):
    return mutate_user(user_id, actor_id, delete=True)

def get_resident_units(user_id):
    if not get_user_by_id(user_id):
        raise NotFound("Usuario no encontrado")

    return query("""
        SELECT r.id_residente, u.id_unidad, u.codigo, u.piso, e.nombre AS edificio, tu.nombre AS tipo_unidad
        FROM residentes r
        JOIN unidades u ON u.id_unidad = r.id_unidad
        JOIN edificios e ON e.id_edificio = u.id_edificio
        JOIN tipo_unidad tu ON tu.id_tipo_unidad = u.id_tipo_unidad
        WHERE r.id_usuario = %s
        ORDER BY e.nombre, u.codigo;
    """, (user_id,), many=True)

def link_resident_unit(user_id, unit_id):
    with transaction() as cursor:
        cursor.execute("""
            SELECT u.id_usuario, u.activo, r.nombre AS rol
            FROM usuarios u
            JOIN roles r ON r.id_rol = u.id_rol
            WHERE u.id_usuario = %s
            FOR SHARE OF u;
        """, (user_id,))

        user = cursor.fetchone()

        if not user:
            raise NotFound("Usuario no encontrado")

        if user["rol"] != "RESIDENTE":
            raise BadRequest("El usuario debe tener el rol RESIDENTE")

        if not user["activo"]:
            raise BadRequest("Debes activar al residente antes de vincularlo")

        cursor.execute("""
            SELECT id_unidad
            FROM unidades
            WHERE id_unidad = %s
            FOR KEY SHARE;
        """, (unit_id,))

        if not cursor.fetchone():
            raise NotFound("Unidad no encontrada")

        cursor.execute("""
            INSERT INTO residentes (id_usuario, id_unidad)
            VALUES (%s, %s)
            ON CONFLICT ON CONSTRAINT uq_residentes_usuario_unidad
            DO NOTHING;
        """, (user_id, unit_id))

    return {"message": "Unidad vinculada correctamente"}

def unlink_resident_unit(user_id, unit_id):
    deleted = query("""
        DELETE FROM residentes
        WHERE id_usuario = %s AND id_unidad = %s
        RETURNING id_residente;
    """, (user_id, unit_id))

    if not deleted:
        raise NotFound("El vínculo no existe")