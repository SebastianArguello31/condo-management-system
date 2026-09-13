from marshmallow import ValidationError, fields

from app.core.validation import BaseSchema, positive_id, required_text

def validate_password(value):
    if len(value) < 8:
        raise ValidationError("Debe tener al menos 8 caracteres")

    if len(value.encode("utf-8")) > 72:
        raise ValidationError("No puede superar 72 bytes")

class UserCreateSchema(BaseSchema):
    nombre = required_text()
    apellido = required_text()
    email = fields.Email(required=True)
    telefono = required_text(40)
    password = fields.Str(required=True, validate=validate_password,)
    id_rol = positive_id()
    activo = fields.Bool()

class UserUpdateSchema(UserCreateSchema):
    pass

class ResidentUnitSchema(BaseSchema):
    id_unidad = positive_id()