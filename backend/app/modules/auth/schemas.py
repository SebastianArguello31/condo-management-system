from marshmallow import Schema, fields, validate

from app.core.passwords import validate_password
from app.core.validation import BaseSchema, required_text

class LoginSchema(BaseSchema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=1, max=200),)

class ForgotPasswordSchema(BaseSchema):
    email = fields.Email(required=True)

class ResetPasswordSchema(BaseSchema):
    token = fields.Str(
        required=True,
        validate=validate.Regexp(
            r"^[A-Za-z0-9_-]{43}$",
            error="El enlace de recuperación no es válido.",
        ),
    )
    password = fields.Str(required=True, validate=validate_password,)

class MyProfileUpdateSchema(BaseSchema):
    nombre = required_text()
    apellido = required_text()
    email = fields.Email(required=True, validate=validate.Length(max=254),)
    telefono = required_text(40)

class ChangePasswordSchema(Schema):
    current_password = fields.Str(required=True, validate=validate.Length(min=1, max=200),)
    password = fields.Str(required=True, validate=validate_password,)