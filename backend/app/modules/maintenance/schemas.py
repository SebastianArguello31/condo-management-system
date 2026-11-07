from marshmallow import fields, validate

from app.core.validation import BaseSchema


class InsumoCreateSchema(BaseSchema):
    nombre = fields.Str(required=True, validate=validate.Length(min=2, max=150))
    descripcion = fields.Str(allow_none=True, validate=validate.Length(max=2000))
    categoria = fields.Str(required=True, validate=validate.Length(min=2, max=80))
    unidad_medida = fields.Str(required=True, validate=validate.Length(min=1, max=40))
    stock_minimo = fields.Decimal(
        required=True, as_string=True, places=3, validate=validate.Range(min=0)
    )
    costo_unitario = fields.Decimal(
        load_default="0", as_string=True, places=2, validate=validate.Range(min=0)
    )


class InsumoUpdateSchema(BaseSchema):
    nombre = fields.Str(validate=validate.Length(min=2, max=150))
    descripcion = fields.Str(allow_none=True, validate=validate.Length(max=2000))
    categoria = fields.Str(validate=validate.Length(min=2, max=80))
    unidad_medida = fields.Str(validate=validate.Length(min=1, max=40))
    stock_minimo = fields.Decimal(as_string=True, places=3, validate=validate.Range(min=0))
    costo_unitario = fields.Decimal(as_string=True, places=2, validate=validate.Range(min=0))
    activo = fields.Boolean()


class MovimientoSchema(BaseSchema):
    cantidad = fields.Decimal(
        required=True,
        as_string=True,
        places=3,
        validate=validate.Range(min=0, min_inclusive=False),
    )
    motivo = fields.Str(required=True, validate=validate.Length(min=3, max=500))


class AjusteSchema(MovimientoSchema):
    direccion = fields.Str(required=True, validate=validate.OneOf(["ENTRADA", "SALIDA"]))


class ConsumoSchema(MovimientoSchema):
    id_insumo = fields.Int(required=True, strict=True, validate=validate.Range(min=1))


class DevolucionSchema(ConsumoSchema):
    pass
