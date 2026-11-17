# Operaciones de negocio para gestores.
# Coordina las comprobaciones y el acceso a los repositorios antes de devolver el resultado.
from app.core.db_helpers import transaction

from .accounts import create_account, list_accounts, lock_management, prepare_account_data, update_managed_account

def list_managers():
    return list_accounts("GESTOR")

def create_manager(data, actor_id):
    prepared_data = prepare_account_data(data)

    with transaction() as cursor:
        lock_management(cursor, actor_id)
        return create_account(cursor, prepared_data, "GESTOR")

def update_manager(user_id, data, actor_id):
    return update_managed_account(user_id, data, actor_id, "GESTOR",)