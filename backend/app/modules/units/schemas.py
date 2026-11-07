from marshmallow import fields, validate

from app.core.validation import BaseSchema, positive_id, required_text

class BuildingTypeCreateSchema(BaseSchema):
    nombre = required_text(100)
    descripcion = fields.Str(
        load_default="",
        validate=validate.Length(max=500),
    )

class BuildingTypeUpdateSchema(BaseSchema):
    nombre = fields.Str(validate=validate.Length(min=1, max=100))
    descripcion = fields.Str(validate=validate.Length(max=500))

class UnitTypeCreateSchema(BaseSchema):
    nombre = required_text(100)
    descripcion = fields.Str(
        load_default="",
        validate=validate.Length(max=500),
    )

class UnitTypeUpdateSchema(BaseSchema):
    nombre = fields.Str(validate=validate.Length(min=1, max=100))
    descripcion = fields.Str(validate=validate.Length(max=500))

class BuildingCreateSchema(BaseSchema):
    nombre = required_text()
    direccion = fields.Str(allow_none=True, validate=validate.Length(max=300))
    id_tipo_edificio = positive_id()

class UnitCreateSchema(BaseSchema):
    codigo = required_text(50)
    piso = fields.Str(allow_none=True, validate=validate.Length(max=30))
    id_edificio = positive_id()
    id_tipo_unidad = positive_id()
