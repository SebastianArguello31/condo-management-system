from marshmallow import ValidationError, fields, validate, validates_schema

from app.core.validation import BaseSchema

ESTADOS_INCIDENCIA = [
    "RECIBIDA", "EN_REVISION", "ASIGNADA", "EN_PROCESO", "EN_ESPERA",
    "RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA",
]

TIPOS_REGISTRO = [
    "incidencias",
    "incidencias_pendientes",
    "incidencias_resueltas",
    "pendientes_intervencion",
    "intervenciones_realizadas",
    "insumos_bajo_stock",
    "insumos_mas_utilizados",
]


class AnalyticsFilterSchema(BaseSchema):
    desde = fields.Date(allow_none=True)
    hasta = fields.Date(allow_none=True)
    id_edificio = fields.Int(allow_none=True, validate=validate.Range(min=1))
    id_tipo_incidencia = fields.Int(allow_none=True, validate=validate.Range(min=1))
    id_prioridad = fields.Int(allow_none=True, validate=validate.Range(min=1))
    id_tecnico = fields.Int(allow_none=True, validate=validate.Range(min=1))

    @validates_schema
    def validar_periodo(self, data, **kwargs):
        if data.get("desde") and data.get("hasta") and data["desde"] > data["hasta"]:
            raise ValidationError("La fecha 'desde' no puede ser posterior a 'hasta'", "desde")


class DrilldownSchema(AnalyticsFilterSchema):
    tipo_registro = fields.Str(required=True, validate=validate.OneOf(TIPOS_REGISTRO))
    estado = fields.Str(allow_none=True, validate=validate.OneOf(ESTADOS_INCIDENCIA))
    limit = fields.Int(load_default=100, validate=validate.Range(min=1, max=500))
