# Esquemas de entrada para vínculos entre residentes y unidades.
# Define los campos admitidos y sus restricciones antes de ejecutar las operaciones del servicio.
from app.core.validation import BaseSchema, positive_id

class ResidentUnitSchema(BaseSchema):
    id_unidad = positive_id()