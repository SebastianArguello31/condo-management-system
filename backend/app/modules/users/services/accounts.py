from psycopg2 import sql
from psycopg2.errors import ForeignKeyViolation
from werkzeug.exceptions import BadRequest, Conflict, Forbidden, NotFound

from app.core.db_helpers import query, transaction
from app.core.security import hash_password

USER_SELECT = """
    SELECT 
        u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
        u.activo, u.created_at, u.id_rol, r.nombre AS rol
    FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
"""

ACCOUNT_FIELDS = {"nombre", "apellido", "email", "telefono", "password", "activo"}

def get_all_users():
    return query(USER_SELECT + " ORDER BY u.apellido, u.nombre, u.id_usuario", many=True)

def get_user_by_id(user_id):
    return query(USER_SELECT + " WHERE u.id_usuario = %s", (user_id,))

def get_roles():
    return query("SELECT id_rol, nombre FROM roles ORDER BY nombre", many=True)

def list_accounts(role):
    return query(USER_SELECT + " WHERE r.nombre = %s ORDER BY u.apellido, u.nombre", (role,), many=True)

def lock_accounts(cursor):
    cursor.execute("LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE")

def require_admin(cursor, actor_id):
    cursor.execute(USER_SELECT + " WHERE u.id_usuario = %s", (actor_id,))
    actor = cursor.fetchone()
    if not actor or not actor["activo"] or actor["rol"] != "ADMIN":
        raise Forbidden("Tu cuenta ya no tiene permisos de administración")

def require_account(cursor, user_id, role=None):
    cursor.execute(USER_SELECT + " WHERE u.id_usuario = %s FOR UPDATE OF u", (user_id,))
    account = cursor.fetchone()
    if not account or (role and account["rol"] != role):
        raise NotFound("Cuenta no encontrada en este flujo")
    return account

def unique_email(cursor, email, user_id=None):
    email = email.strip().lower()
    cursor.execute("""
        SELECT id_usuario FROM usuarios
        WHERE lower(btrim(email)) = %s AND id_usuario <> %s
    """, (email, user_id or 0))
    if cursor.fetchone():
        raise Conflict("El correo ya pertenece a otra cuenta")
    return email

def create_account(cursor, *, nombre, apellido, email, telefono, password, role_name, activo=True):
    lock_accounts(cursor)
    email = unique_email(cursor, email)
    cursor.execute("SELECT id_rol FROM roles WHERE nombre = %s", (role_name,))
    role = cursor.fetchone()
    if not role:
        raise BadRequest("El rol requerido no está configurado")
    cursor.execute("""
        INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, id_rol, activo)
        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_usuario
    """, (nombre, apellido, email, telefono, hash_password(password), role["id_rol"], activo))
    return require_account(cursor, cursor.fetchone()["id_usuario"])

def update_account(cursor, user_id, data, *, allowed_fields=ACCOUNT_FIELDS):
    if not data or not set(data).issubset(allowed_fields):
        raise BadRequest("Campos de actualización inválidos")
    changes = dict(data)
    if "email" in changes:
        changes["email"] = unique_email(cursor, changes["email"], user_id)
    if "password" in changes:
        changes["password_hash"] = hash_password(changes.pop("password"))
    assignments = sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(field)) for field in changes)
    cursor.execute(sql.SQL("UPDATE usuarios SET {} WHERE id_usuario = %s").format(assignments), (*changes.values(), user_id))
    return require_account(cursor, user_id)

def update_managed_account(user_id, data, actor_id, role=None, *, access_only=False):
    with transaction() as cursor:
        lock_accounts(cursor)
        require_admin(cursor, actor_id)
        require_account(cursor, user_id, role)
        if user_id == actor_id and data.get("activo") is False:
            raise BadRequest("No puedes desactivar tu propia cuenta")
        return update_account(cursor, user_id, data, allowed_fields={"activo"} if access_only else ACCOUNT_FIELDS)

def delete_account(user_id, actor_id, role=None):
    try:
        with transaction() as cursor:
            lock_accounts(cursor)
            require_admin(cursor, actor_id)
            require_account(cursor, user_id, role)
            if user_id == actor_id:
                raise BadRequest("No puedes eliminar tu propia cuenta")
            cursor.execute("DELETE FROM usuario_especialidades WHERE id_usuario = %s", (user_id,))
            cursor.execute("DELETE FROM usuario_cargos WHERE id_usuario = %s", (user_id,))
            cursor.execute("DELETE FROM usuarios WHERE id_usuario = %s", (user_id,))
    except ForeignKeyViolation:
        raise Conflict("No se puede eliminar: la cuenta tiene registros relacionados. Puedes desactivarla para impedir su acceso.") from None
