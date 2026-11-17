# Esquemas de entrada para gestores.
# Define los campos admitidos y sus restricciones antes de ejecutar las operaciones del servicio.
from .accounts import AccountSchema

class ManagerCreateSchema(AccountSchema):
    pass

class ManagerUpdateSchema(AccountSchema):
    pass