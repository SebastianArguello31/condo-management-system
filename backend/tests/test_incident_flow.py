import unittest
from contextlib import contextmanager
from unittest.mock import MagicMock, patch
from werkzeug.exceptions import Forbidden, BadRequest
from marshmallow import ValidationError

from app.modules.incidents.schemas import (
    IncidentPriorityUpdateSchema,
    IncidentAssignSchema,
    IncidentStatusUpdateSchema,
)
from app.modules.incidents.services import ALLOWED_TRANSITIONS
from app.modules.incidents import services


class TestTechnicianStatus(unittest.TestCase):
    def test_detail_offers_closure(self):
        incident = {"estado": "RESUELTA", "id_personal_asignado": 7}
        with patch.object(services, "query", side_effect=[incident, []]):
            result = services.get_incident(1, {"rol": "TECNICO", "id_usuario": 7})
        self.assertIn("CERRADA", result["estados_permitidos"])

    def change_status(self, assigned=7, current="RESUELTA", target="CERRADA"):
        cursor = MagicMock()
        cursor.fetchone.side_effect = [
            {"id_incidencia": 1, "id_reportante": 2,
             "fecha_resolucion": None, "id_personal_asignado": assigned},
            {"estado_actual": current},
            {"nombre": target, "id_estados_incidencia": 8},
            {"next_version": 4},
        ]

        @contextmanager
        def transaction():
            yield cursor

        with patch.object(services, "transaction", transaction), patch.object(
            services, "get_incident", return_value={"estado": target}
        ):
            result = services.update_status(
                1, {"estado": target, "comentario": "Trabajo terminado"},
                {"rol": "TECNICO", "id_usuario": 7},
            )
        return result, cursor

    def test_assigned_technician_can_close_resolved_incident(self):
        result, cursor = self.change_status()
        self.assertEqual(result["estado"], "CERRADA")
        history_calls = [
            call for call in cursor.execute.call_args_list
            if "INSERT INTO historial_incidencia" in call.args[0]
        ]
        self.assertEqual(len(history_calls), 1)
        self.assertEqual(history_calls[0].args[1], (4, 8, 1, 7, "Trabajo terminado"))

    def test_other_technician_cannot_close(self):
        with self.assertRaises(Forbidden):
            self.change_status(assigned=99)

    def test_cannot_close_before_resolving(self):
        with self.assertRaises(BadRequest):
            self.change_status(current="EN_PROCESO")

    def test_technician_cannot_cancel(self):
        with self.assertRaises(Forbidden):
            self.change_status(current="EN_PROCESO", target="CANCELADA")


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
