from app.core.validation import BaseSchema, positive_id

class ResidentUnitSchema(BaseSchema):
    id_unidad = positive_id()
