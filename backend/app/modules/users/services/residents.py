from werkzeug.exceptions import Conflict, Forbidden, NotFound

from app.core.db_helpers import query, transaction
from .accounts import (
    create_account,
    lock_accounts,
    require_account,
    require_admin,
    update_account,
)

RESIDENT_SELECT = """
    SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
           u.activo, u.created_at, r.nombre AS rol,
           res.id_residente, un.id_unidad, un.codigo AS unidad,
           un.piso, e.id_edificio, e.nombre AS edificio,
           tu.nombre AS tipo_unidad
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.id_rol
    LEFT JOIN residentes res ON res.id_usuario = u.id_usuario
    LEFT JOIN unidades un ON un.id_unidad = res.id_unidad
    LEFT JOIN edificios e ON e.id_edificio = un.id_edificio
    LEFT JOIN tipo_unidad tu ON tu.id_tipo_unidad = un.id_tipo_unidad
"""


def _resident_rows(cursor, user_id):
    cursor.execute(
        RESIDENT_SELECT + """
        WHERE u.id_usuario = %s AND r.nombre = 'RESIDENTE'
        ORDER BY un.codigo NULLS LAST
        """,
        (user_id,),
    )
    return cursor.fetchall()


def list_residents():
    return query(
        RESIDENT_SELECT + """
        WHERE r.nombre = 'RESIDENTE'
        ORDER BY u.apellido, u.nombre, un.codigo NULLS LAST
        """,
        many=True,
    )


def create_resident(data, actor_id):
    account_data = dict(data)
    unit_id = account_data.pop("id_unidad")

    with transaction() as cursor:
        lock_accounts(cursor)
        require_admin(cursor, actor_id)
        cursor.execute(
            "SELECT id_unidad FROM unidades WHERE id_unidad = %s FOR KEY SHARE",
            (unit_id,),
        )
        if not cursor.fetchone():
            raise NotFound("Unidad no encontrada")

        account = create_account(
            cursor, role_name="RESIDENTE", **account_data
        )
        cursor.execute(
            """
            INSERT INTO residentes (id_usuario, id_unidad)
            VALUES (%s, %s)
            ON CONFLICT ON CONSTRAINT uq_residentes_usuario_unidad
            DO NOTHING
            RETURNING id_residente
            """,
            (account["id_usuario"], unit_id),
        )
        if not cursor.fetchone():
            raise Conflict("El residente ya está vinculado a esa unidad")
        return _resident_rows(cursor, account["id_usuario"])


def update_resident(user_id, data, actor_id):
    changes = dict(data)
    unit_id = changes.pop("id_unidad", None)

    with transaction() as cursor:
        lock_accounts(cursor)
        require_admin(cursor, actor_id)
        require_account(cursor, user_id, "RESIDENTE")

        if changes:
            update_account(cursor, user_id, changes)

        if unit_id is not None:
            cursor.execute(
                "SELECT id_unidad FROM unidades WHERE id_unidad = %s FOR KEY SHARE",
                (unit_id,),
            )
            if not cursor.fetchone():
                raise NotFound("Unidad no encontrada")
            cursor.execute(
                """
                INSERT INTO residentes (id_usuario, id_unidad)
                VALUES (%s, %s)
                ON CONFLICT ON CONSTRAINT uq_residentes_usuario_unidad
                DO NOTHING
                RETURNING id_residente
                """,
                (user_id, unit_id),
            )
            if not cursor.fetchone():
                raise Conflict("El residente ya está vinculado a esa unidad")

        return _resident_rows(cursor, user_id)


def deactivate_resident(user_id, actor_id):
    with transaction() as cursor:
        lock_accounts(cursor)
        require_admin(cursor, actor_id)
        require_account(cursor, user_id, "RESIDENTE")
        if user_id == actor_id:
            raise Forbidden("No puedes desactivar tu propia cuenta")
        cursor.execute(
            "UPDATE usuarios SET activo = FALSE WHERE id_usuario = %s",
            (user_id,),
        )


def get_my_profile(user_id):
    rows = query(
        RESIDENT_SELECT + """
        WHERE u.id_usuario = %s AND r.nombre = 'RESIDENTE'
        ORDER BY un.codigo NULLS LAST
        """,
        (user_id,),
        many=True,
    )
    if not rows:
        raise NotFound("Perfil de residente no encontrado")
    return rows[0]


def update_my_profile(user_id, data):
    with transaction() as cursor:
        account = require_account(cursor, user_id, "RESIDENTE")
        if not account["activo"]:
            raise Forbidden("Tu cuenta está desactivada")
        update_account(
            cursor,
            user_id,
            data,
            allowed_fields={"nombre", "apellido", "email", "telefono"},
        )
        return _resident_rows(cursor, user_id)[0]


def get_my_units(user_id):
    if not query(
        """
        SELECT u.id_usuario
        FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = %s AND r.nombre = 'RESIDENTE'
        """,
        (user_id,),
    ):
        raise NotFound("Residente no encontrado")

    return query(
        """
        SELECT res.id_residente, un.id_unidad, un.codigo AS unidad,
               un.piso, e.id_edificio, e.nombre AS edificio,
               tu.nombre AS tipo_unidad
        FROM residentes res
        JOIN unidades un ON un.id_unidad = res.id_unidad
        JOIN edificios e ON e.id_edificio = un.id_edificio
        JOIN tipo_unidad tu ON tu.id_tipo_unidad = un.id_tipo_unidad
        WHERE res.id_usuario = %s
        ORDER BY e.nombre, un.codigo
        """,
        (user_id,),
        many=True,
    )
