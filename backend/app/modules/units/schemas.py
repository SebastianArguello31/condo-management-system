from marshmallow import fields, validate

from app.core.validation import BaseSchema, positive_id, required_text

class BuildingCreateSchema(BaseSchema):
    nombre = required_text()
    direccion = fields.Str(allow_none=True, validate=validate.Length(max=300),)
    id_tipo_edificio = positive_id()

class UnitCreateSchema(BaseSchema):
    codigo = required_text(50)
    piso = fields.Str(allow_none=True, validate=validate.Length(max=30),)
    id_edificio = positive_id()
    id_tipo_unidad = positive_id()