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
