from marshmallow import ValidationError, fields, validate, validates_schema

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
    id_tipo_evento = fields.Int(load_default=None, validate=validate.Range(min=1),)

class PolicySchema(BaseSchema):
    id_tipo_evento = positive_id()
    hora_apertura = fields.Time(required=True, format="%H:%M")
    hora_cierre = fields.Time(required=True, format="%H:%M")
    duracion_max_horas = fields.Int(required=True, strict=True, validate=validate.Range(min=1, max=24))
    dias_anticipacion_min = fields.Int(required=True, strict=True, validate=validate.Range(min=0))
    dias_anticipacion_max = fields.Int(required=True, strict=True, validate=validate.Range(min=0))
    aforo_maximo = fields.Int(required=True, strict=True, validate=validate.Range(min=1))
    costo = fields.Decimal(required=True, places=2, validate=validate.Range(min=0), allow_nan=False)
    deposito_garantia = fields.Decimal(required=True, places=2, validate=validate.Range(min=0), allow_nan=False)
    penalizaciones = fields.Decimal(required=True, places=2, validate=validate.Range(min=0), allow_nan=False)

    @validates_schema
    def validate_bounds(self, data, **kwargs):
        if data["hora_cierre"] <= data["hora_apertura"]:
            raise ValidationError("El cierre debe ser posterior a la apertura")
        if data["dias_anticipacion_max"] < data["dias_anticipacion_min"]:
            raise ValidationError("La anticipación máxima debe ser mayor o igual a la mínima")
