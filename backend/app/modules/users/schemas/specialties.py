from marshmallow import fields, validate
from app.core.validation import BaseSchema, positive_id, required_text

class SpecialtyCreateSchema(BaseSchema):
    nombre = required_text(100)
    descripcion = fields.Str(load_default="", validate=validate.Length(max=500))
    activo = fields.Boolean(load_default=True, truthy={True}, falsy={False})

class SpecialtyUpdateSchema(SpecialtyCreateSchema):
    pass

class EmployeeSpecialtySchema(BaseSchema):
    id_especialidad = positive_id()
