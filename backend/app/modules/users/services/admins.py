from werkzeug.exceptions import BadRequest
from app.core.db_helpers import transaction
from .accounts import create_account, list_accounts, lock_accounts, require_admin, update_managed_account

def create_admin(data, actor_id):
    with transaction() as cursor:
        lock_accounts(cursor)
        require_admin(cursor, actor_id)
        return create_account(cursor, role_name="ADMIN", **data)

def create_user(nombre, apellido, email, telefono, password, id_rol, activo=True):
    """Entrada local que conserva create_admin.py; no está expuesta como ruta."""
    with transaction() as cursor:
        cursor.execute("SELECT nombre FROM roles WHERE id_rol = %s", (id_rol,))
        role = cursor.fetchone()
        if not role or role["nombre"] != "ADMIN":
            raise BadRequest("Este script solo permite crear administradores")
        return create_account(cursor, nombre=nombre, apellido=apellido, email=email, telefono=telefono, password=password, role_name="ADMIN", activo=activo)

def list_admins():
    return list_accounts("ADMIN")

def update_admin(user_id, data, actor_id):
    return update_managed_account(user_id, data, actor_id, "ADMIN")

def deactivate_admin(user_id, actor_id):
    update_managed_account(user_id, {"activo": False}, actor_id, "ADMIN")
