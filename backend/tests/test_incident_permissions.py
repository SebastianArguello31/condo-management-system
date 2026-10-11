import unittest
from unittest.mock import patch

from werkzeug.exceptions import BadRequest, Forbidden

from app.modules.incidents import services
from app.modules.incidents.rules import can_register_intervention, get_allowed_statuses, validate_transition

class TestIncidentPermissions(unittest.TestCase):
    def setUp(self):
        self.admin = {"id_usuario": 1, "rol": "ADMIN"}
        self.resident = {"id_usuario": 2, "rol": "RESIDENTE"}
        self.technician = {"id_usuario": 3, "rol": "TECNICO"}
        self.incident = {
            "id_incidencia": 10,
            "id_reportante": 2,
            "id_personal_asignado": 3,
            "estado": "ASIGNADA",
        }

    def test_admin_puede_gestionar_ciclo_y_reabrir(self):
        for current, target in [
            ("RECIBIDA", "EN_REVISION"),
            ("EN_REVISION", "RECHAZADA"),
            ("ASIGNADA", "EN_PROCESO"),
            ("EN_PROCESO", "RESUELTA"),
            ("RESUELTA", "CERRADA"),
            ("CERRADA", "EN_PROCESO"),
        ]:
            with self.subTest(current=current, target=target):
                incident = {**self.incident, "estado": current}
                self.assertIn(target, get_allowed_statuses(incident, self.admin))
                validate_transition(incident, target, self.admin)

    def test_admin_no_puede_saltar_estados(self):
        with self.assertRaises(BadRequest):
            validate_transition(self.incident, "CERRADA", self.admin)

    def test_intervencion_segun_rol_y_estado(self):
        for role in [self.admin, self.technician, self.resident]:
            for state in [
                "RECIBIDA", "EN_REVISION", "ASIGNADA", "EN_PROCESO",
                "EN_ESPERA", "RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA",
            ]:
                with self.subTest(role=role["rol"], state=state):
                    expected = role["rol"] != "RESIDENTE" and state in {
                        "ASIGNADA", "EN_PROCESO", "EN_ESPERA",
                    }
                    self.assertEqual(can_register_intervention(
                        {**self.incident, "estado": state}, role,
                    ), expected)

    def test_admin_necesita_tecnico_asignado(self):
        incident = {**self.incident, "id_personal_asignado": None}
        self.assertFalse(can_register_intervention(incident, self.admin))
        self.assertNotIn("EN_PROCESO", get_allowed_statuses(incident, self.admin))

    def test_tecnico_ajeno_no_tiene_acceso(self):
        other = {"id_usuario": 4, "rol": "TECNICO"}
        with self.assertRaises(Forbidden):
            can_register_intervention(self.incident, other)
        with self.assertRaises(Forbidden):
            validate_transition(self.incident, "EN_PROCESO", other)

    def test_residente_no_puede_cambiar_estado_operativo(self):
        with self.assertRaises(Forbidden):
            validate_transition(self.incident, "EN_PROCESO", self.resident)
        with self.assertRaises(Forbidden):
            services.create_intervention(10, {"resultado": "Revision"}, self.resident)

    def test_detalle_publica_capacidad_del_admin(self):
        with (
            patch.object(services.incident_repo, "get_incident", return_value=dict(self.incident)),
            patch.object(services.attachments_repo, "list_attachments", return_value=[]),
        ):
            detail = services._get_detail(10, self.admin, cursor=None)
        self.assertTrue(detail["puede_registrar_intervencion"])
        self.assertIn("EN_PROCESO", detail["estados_permitidos"])

    def test_intervencion_registra_admin_como_autor(self):
        with (
            patch.object(services, "transaction"),
            patch.object(services, "_get_context", return_value=self.incident),
            patch.object(services.activity_repo, "insert_intervention", return_value={"id_intervencion": 5}) as insert,
            patch.object(services.incident_repo, "touch_incident"),
        ):
            result = services.create_intervention(10, {"resultado": "Revision administrativa"}, self.admin)
        self.assertEqual(result["id_intervencion"], 5)
        self.assertEqual(insert.call_args.args, (10, 1, "Revision administrativa"))

    def test_intervencion_cerrada_no_se_guarda(self):
        with (
            patch.object(services, "transaction"),
            patch.object(services, "_get_context", return_value={**self.incident, "estado": "CERRADA"}),
            patch.object(services.activity_repo, "insert_intervention") as insert,
        ):
            with self.assertRaises(BadRequest):
                services.create_intervention(10, {"resultado": "Revision administrativa"}, self.admin)
        insert.assert_not_called()
