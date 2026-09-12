from marshmallow import fields, validate

from app.core.validation import BaseSchema

class LoginSchema(BaseSchema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=1, max=200),)