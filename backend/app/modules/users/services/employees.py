from werkzeug.exceptions import NotFound

from app.core.db_helpers import transaction
from app.modules.users.repositories import accounts as accounts_repo
from app.modules.users.repositories import employees as employees_repo

from .accounts import lock_management, create_account, require_account, save_account, prepare_account_data
from .specialties import replace_specialties

def get_employee_detail(user_id, *, cursor=None):
    rows = employees_repo.find_employees(user_id, cursor=cursor)

    if not rows:
        raise NotFound("Empleado no encontrado")

    return rows[0]

def list_employees():
    return employees_repo.find_employees()

def create_employee(data, actor_id):
    account_data = dict(data)
    specialties = account_data.pop("especialidad_ids")
    prepared_data = prepare_account_data(account_data)

    with transaction() as cursor:
        lock_management(cursor, actor_id)

        account = create_account(cursor, prepared_data, "TECNICO")

        replace_specialties(cursor, account["id_usuario"], specialties)

        return get_employee_detail(account["id_usuario"], cursor=cursor)

def update_employee(user_id, data, actor_id):
    changes = dict(data)
    specialties = changes.pop("especialidad_ids", None)

    prepared_data = prepare_account_data(changes) if changes else {}

    with transaction() as cursor:
        lock_management(cursor, actor_id, user_id, "TECNICO")

        if prepared_data:
            save_account(cursor, user_id, prepared_data)

        if specialties is not None:
            replace_specialties(cursor, user_id, specialties)

        return get_employee_detail(user_id, cursor=cursor)

def get_employee_profile(user_id):
    with transaction() as cursor:
        require_account(accounts_repo.get_user(user_id, cursor=cursor), "TECNICO", active=True)

        return get_employee_detail(user_id, cursor=cursor)

def update_employee_profile(user_id, data):
    prepared_data = prepare_account_data(data, {"nombre", "apellido", "email", "telefono"})

    with transaction() as cursor:
        accounts = accounts_repo.lock_users([user_id], cursor=cursor)

        require_account(accounts.get(user_id), "TECNICO", active=True)

        save_account(cursor, user_id, prepared_data)

        return get_employee_detail(user_id, cursor=cursor)