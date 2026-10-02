from marshmallow import fields, pre_load, validate
from app.core.passwords import validate_password
from app.core.validation import BaseSchema, positive_id, required_text

class AccountSchema(BaseSchema):
    nombre = required_text()
    apellido = required_text()
    email = fields.Email(required=True, validate=validate.Length(max=254))
    telefono = required_text(40)
    password = fields.Str(required=True, validate=validate_password)
    activo = fields.Boolean(load_default=True, truthy={True}, falsy={False})

    @pre_load
    def normalize_email(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("email"), str):
            data = {**data, "email": data["email"].strip().lower()}
        return data

class AccessUpdateSchema(BaseSchema):
    activo = fields.Boolean(required=True, truthy={True}, falsy={False})

class UserCreateSchema(AccountSchema):
    """Compatibilidad con el script local create_admin.py, sin alta HTTP genérica."""
    id_rol = positive_id()
