from werkzeug.exceptions import BadRequest, Forbidden
from app.core.db_helpers import query, transaction
from .accounts import create_account, lock_accounts, require_account, require_admin, update_account

EMPLOYEE_SELECT = """
    SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
           u.activo, u.created_at, u.id_rol, r.nombre AS rol,
           ARRAY(SELECT ue.id_especialidad FROM usuario_especialidades ue
                 WHERE ue.id_usuario = u.id_usuario ORDER BY ue.id_especialidad) AS especialidad_ids,
           COALESCE((SELECT json_agg(json_build_object(
               'id_especialidad', e.id_especialidad, 'nombre', e.nombre,
               'descripcion', e.descripcion, 'activo', e.activo) ORDER BY e.nombre)
             FROM usuario_especialidades ue JOIN especialidades e USING (id_especialidad)
             WHERE ue.id_usuario = u.id_usuario), '[]'::json) AS especialidades
    FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
"""

def list_employees():
    return query(EMPLOYEE_SELECT + " WHERE r.nombre = 'TECNICO' ORDER BY u.apellido, u.nombre", many=True)

def employee_details(cursor, user_id):
    cursor.execute(EMPLOYEE_SELECT + " WHERE u.id_usuario = %s", (user_id,))
    return cursor.fetchone()

def replace_specialties(cursor, user_id, specialty_ids):
    ids = sorted(set(specialty_ids))
    if not ids:
        raise BadRequest("Selecciona al menos una especialidad laboral")
    cursor.execute("SELECT id_especialidad FROM usuario_especialidades WHERE id_usuario = %s", (user_id,))
    previous = {row["id_especialidad"] for row in cursor.fetchall()}
    cursor.execute("SELECT id_especialidad, activo FROM especialidades WHERE id_especialidad = ANY(%s) FOR SHARE", (ids,))
    specialties = cursor.fetchall()
    if len(specialties) != len(ids):
        raise BadRequest("Una especialidad seleccionada ya no existe")
    if any(not row["activo"] and row["id_especialidad"] not in previous for row in specialties):
        raise BadRequest("No puedes asignar una especialidad inactiva")
    cursor.execute("DELETE FROM usuario_especialidades WHERE id_usuario = %s", (user_id,))
    cursor.executemany("INSERT INTO usuario_especialidades (id_usuario, id_especialidad) VALUES (%s, %s)", [(user_id, specialty_id) for specialty_id in ids])

def create_employee(data, actor_id):
    account_data = dict(data)
    specialty_ids = account_data.pop("especialidad_ids")
    with transaction() as cursor:
        lock_accounts(cursor)
        require_admin(cursor, actor_id)
        account = create_account(cursor, role_name="TECNICO", **account_data)
        replace_specialties(cursor, account["id_usuario"], specialty_ids)
        return employee_details(cursor, account["id_usuario"])

def update_employee(user_id, data, actor_id):
    changes = dict(data)
    specialty_ids = changes.pop("especialidad_ids", None)
    with transaction() as cursor:
        lock_accounts(cursor)
        require_admin(cursor, actor_id)
        require_account(cursor, user_id, "TECNICO")
        if changes:
            update_account(cursor, user_id, changes)
        if specialty_ids is not None:
            replace_specialties(cursor, user_id, specialty_ids)
        return employee_details(cursor, user_id)

def get_employee_profile(user_id):
    with transaction() as cursor:
        account = require_account(cursor, user_id, "TECNICO")
        if not account["activo"]:
            raise Forbidden("Tu cuenta está desactivada")
        return employee_details(cursor, user_id)

def update_employee_profile(user_id, data):
    with transaction() as cursor:
        lock_accounts(cursor)
        account = require_account(cursor, user_id, "TECNICO")
        if not account["activo"]:
            raise Forbidden("Tu cuenta está desactivada")
        update_account(cursor, user_id, data, allowed_fields={"nombre", "apellido", "email", "telefono"})
        return employee_details(cursor, user_id)
