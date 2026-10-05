from marshmallow import fields, validate

from app.core.validation import BaseSchema, positive_id, required_text

class EspacioCreateSchema(BaseSchema):
    nombre = required_text(150)
    descripcion = fields.Str(allow_none=True, validate=validate.Length(max=1000),)
    capacidad = fields.Int(required=True, strict=True, validate=validate.Range(min=1),)
    id_edificio = positive_id()

class EspacioUpdateSchema(BaseSchema):
    nombre = required_text(150)
    descripcion = fields.Str(allow_none=True, validate=validate.Length(max=1000),)
    capacidad = fields.Int(strict=True, validate=validate.Range(min=1),)
    id_edificio = positive_id()
    activo = fields.Bool()

class DisponibilidadQuerySchema(BaseSchema):
    fecha_inicio = fields.Date(required=True)
    fecha_fin = fields.Date(required=True)
    id_tipo_evento = fields.Int(
        load_default=None,
        validate=validate.Range(min=1),
    )
