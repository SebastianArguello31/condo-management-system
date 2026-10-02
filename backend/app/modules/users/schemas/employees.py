from marshmallow import fields, validate
from app.core.validation import BaseSchema, positive_id, required_text
from .accounts import AccountSchema

class EmployeeCreateSchema(AccountSchema):
    especialidad_ids = fields.List(positive_id(), required=True, validate=validate.Length(min=1))

class EmployeeUpdateSchema(EmployeeCreateSchema):
    pass

class EmployeeProfileUpdateSchema(BaseSchema):
    nombre = required_text()
    apellido = required_text()
    email = fields.Email(required=True, validate=validate.Length(max=254))
    telefono = required_text(40)
