# Esquemas de entrada para administradores.
# Define los campos admitidos y sus restricciones antes de ejecutar las operaciones del servicio.
from .accounts import AccountSchema

class AdminCreateSchema(AccountSchema):
    pass

class AdminUpdateSchema(AccountSchema):
    pass
