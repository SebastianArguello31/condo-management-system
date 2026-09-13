from marshmallow import fields, validate

from app.core.validation import BaseSchema

class IncidentCreateSchema(BaseSchema):
    titulo = fields.Str(required=True, validate=validate.Length(min=5, max=150),)
    descripcion = fields.Str(required=True, validate=validate.Length(min=10, max=5000),)
    id_unidad = fields.Int(required=True, validate=validate.Range(min=1),)
    id_tipo_incidencia = fields.Int(required=True, validate=validate.Range(min=1),)