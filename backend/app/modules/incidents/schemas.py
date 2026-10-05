from marshmallow import ValidationError, fields, validate, validates_schema

from app.core.validation import BaseSchema

class IncidentCreateSchema(BaseSchema):
    titulo = fields.Str(required=True, validate=validate.Length(min=5, max=150),)
    descripcion = fields.Str(required=True, validate=validate.Length(min=10, max=5000),)
    id_unidad = fields.Int(required=True, validate=validate.Range(min=1),)
    id_tipo_incidencia = fields.Int(required=True, validate=validate.Range(min=1),)

class IncidentPriorityUpdateSchema(BaseSchema):
    id_prioridad = fields.Int(required=True, validate=validate.Range(min=1))

class IncidentAssignSchema(BaseSchema):
    id_personal_asignado = fields.Int(required=True, validate=validate.Range(min=1))
    notas = fields.Str(required=False, validate=validate.Length(max=500), allow_none=True)

class IncidentStatusUpdateSchema(BaseSchema):
    id_estado = fields.Int(required=False, validate=validate.Range(min=1), allow_none=True)
    estado = fields.Str(required=False, validate=validate.Length(min=2, max=50), allow_none=True)
    comentario = fields.Str(required=False, validate=validate.Length(max=500), allow_none=True)

    @validates_schema
    def validate_target(self, data, **kwargs):
        if bool(data.get("id_estado")) == bool(data.get("estado")):
            raise ValidationError("Indica exactamente uno de id_estado o estado")

class InterventionCreateSchema(BaseSchema):
    resultado = fields.Str(required=True, validate=validate.Length(min=5, max=5000))
