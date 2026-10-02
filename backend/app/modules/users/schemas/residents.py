from marshmallow import fields, validate

from app.core.validation import BaseSchema, positive_id, required_text
from .accounts import AccountSchema


class ResidentCreateSchema(AccountSchema):
    id_unidad = positive_id()


class ResidentUpdateSchema(BaseSchema):
    nombre = required_text()
    apellido = required_text()
    email = fields.Email(validate=validate.Length(max=254))
    telefono = required_text(40)
    activo = fields.Boolean(truthy={True}, falsy={False})
    id_unidad = positive_id()


class ResidentProfileUpdateSchema(BaseSchema):
    nombre = required_text()
    apellido = required_text()
    email = fields.Email(validate=validate.Length(max=254))
    telefono = required_text(40)
