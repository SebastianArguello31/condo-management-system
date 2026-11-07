from marshmallow import (ValidationError, fields, validate, validates_schema)

from app.core.validation import BaseSchema

class IncidentCreateSchema(BaseSchema):
    titulo = fields.Str(required=True, validate=validate.Length(min=5, max=150))
    descripcion = fields.Str(required=True, validate=validate.Length(min=10, max=5000))
    id_unidad = fields.Int(required=True, validate=validate.Range(min=1))
    id_tipo_incidencia = fields.Int(required=True, validate=validate.Range(min=1))

class IncidentPriorityUpdateSchema(BaseSchema):
    id_prioridad = fields.Int(required=True, validate=validate.Range(min=1))

class IncidentAssignSchema(BaseSchema):
    id_personal_asignado = fields.Int(required=True, validate=validate.Range(min=1))
    notas = fields.Str(allow_none=True, validate=validate.Length(max=500))

class IncidentStatusUpdateSchema(BaseSchema):
    id_estado = fields.Int(allow_none=True, validate=validate.Range(min=1))
    estado = fields.Str(allow_none=True, validate=validate.Length(min=2, max=50))
    comentario = fields.Str(allow_none=True, validate=validate.Length(max=500))

    @validates_schema
    def validate_target(self, data, **kwargs):
        has_id = bool(data.get("id_estado"))
        has_name = bool(data.get("estado"))
        if has_id == has_name:
            raise ValidationError("Indica exactamente uno de id_estado o estado")

class InterventionCreateSchema(BaseSchema):
    resultado = fields.Str(required=True, validate=validate.Length(min=5, max=5000))