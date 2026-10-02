import unittest
from marshmallow import ValidationError

from app.modules.incidents.schemas import (
    IncidentPriorityUpdateSchema,
    IncidentAssignSchema,
    IncidentStatusUpdateSchema,
)
from app.modules.incidents.services import ALLOWED_TRANSITIONS


class TestIncidentSchemas(unittest.TestCase):
    def test_priority_update_schema_valid(self):
        schema = IncidentPriorityUpdateSchema()
        result = schema.load({"id_prioridad": 2})
        self.assertEqual(result["id_prioridad"], 2)

    def test_priority_update_schema_invalid(self):
        schema = IncidentPriorityUpdateSchema()
        with self.assertRaises(ValidationError):
            schema.load({"id_prioridad": 0})
        with self.assertRaises(ValidationError):
            schema.load({})

    def test_assign_schema_valid(self):
        schema = IncidentAssignSchema()
        result = schema.load({"id_personal_asignado": 5, "notas": "Revisar fuga urgente"})
        self.assertEqual(result["id_personal_asignado"], 5)
        self.assertEqual(result["notas"], "Revisar fuga urgente")

    def test_assign_schema_invalid(self):
        schema = IncidentAssignSchema()
        with self.assertRaises(ValidationError):
            schema.load({"id_personal_asignado": -1})
        with self.assertRaises(ValidationError):
            schema.load({})

    def test_status_update_schema_valid_by_id(self):
        schema = IncidentStatusUpdateSchema()
        result = schema.load({"id_estado": 3, "comentario": "Iniciando revision"})
        self.assertEqual(result["id_estado"], 3)
        self.assertEqual(result["comentario"], "Iniciando revision")

    def test_status_update_schema_valid_by_name(self):
        schema = IncidentStatusUpdateSchema()
        result = schema.load({"estado": "EN_PROCESO"})
        self.assertEqual(result["estado"], "EN_PROCESO")


class TestIncidentStateMachine(unittest.TestCase):
    def test_allowed_transitions_from_recibida(self):
        transitions = ALLOWED_TRANSITIONS.get("RECIBIDA")
        self.assertIn("ASIGNADA", transitions)
        self.assertIn("EN_REVISION", transitions)
        self.assertIn("RECHAZADA", transitions)
        self.assertIn("CANCELADA", transitions)
        self.assertNotIn("RESUELTA", transitions)
        self.assertNotIn("CERRADA", transitions)

    def test_allowed_transitions_from_asignada(self):
        transitions = ALLOWED_TRANSITIONS.get("ASIGNADA")
        self.assertIn("EN_PROCESO", transitions)
        self.assertIn("EN_ESPERA", transitions)
        self.assertNotIn("RESUELTA", transitions)

    def test_allowed_transitions_from_en_proceso(self):
        transitions = ALLOWED_TRANSITIONS.get("EN_PROCESO")
        self.assertIn("RESUELTA", transitions)
        self.assertIn("EN_ESPERA", transitions)
        self.assertNotIn("RECIBIDA", transitions)

    def test_allowed_transitions_from_resuelta(self):
        transitions = ALLOWED_TRANSITIONS.get("RESUELTA")
        self.assertIn("CERRADA", transitions)
        self.assertIn("EN_PROCESO", transitions)  # reapertura


if __name__ == "__main__":
    unittest.main()
