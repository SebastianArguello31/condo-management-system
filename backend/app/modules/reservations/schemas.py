from marshmallow import fields, validate

from app.core.validation import BaseSchema, positive_id

class ReservaCreateSchema(BaseSchema):
    id_espacio = positive_id()
    fecha = fields.Date(required=True)
    hora_inicio = fields.Time(required=True)
    hora_fin = fields.Time(required=True)
    cantidad_personas = fields.Int(
        required=True,
        strict=True,
        validate=validate.Range(min=1),
    )
    id_tipo_evento = positive_id()
    observaciones = fields.Str(
        load_default="",
        validate=validate.Length(max=500),
    )

class ReservaListQuerySchema(BaseSchema):
    espacio = fields.Int(load_default=None, validate=validate.Range(min=1))
    estado = fields.Str(
        load_default=None,
        validate=validate.Length(min=1, max=50),
    )
    fecha = fields.Date(load_default=None)
    residente = fields.Int(load_default=None, validate=validate.Range(min=1))
