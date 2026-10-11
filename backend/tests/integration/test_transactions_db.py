from unittest.mock import patch

from werkzeug.exceptions import BadRequest

from tests.integration.support import DatabaseCase
from app.modules.users.services import employees
from app.modules.incidents import services as incidencias

class TestTransactionsDatabase(DatabaseCase):
    def test_tecnico_no_queda_creado_si_falla_especialidad(self):
        with self.assertRaises(BadRequest):
            employees.create_employee(
                {
                    "nombre": "Nuevo",
                    "apellido": "Tecnico",
                    "email": "rollback@example.com",
                    "telefono": "12345678",
                    "password": "Clave-pruebas-123",
                    "especialidad_ids": [2147483647],
                },
                self.admin["id_usuario"],
            )

        self.assertEqual(
            self.consultar(
                "SELECT count(*) FROM usuarios "
                "WHERE email='rollback@example.com'"
            )[0][0],
            0,
        )
        self.assertTrue(
            all(conexion.closed for conexion in self.conexiones)
        )

    def test_fallo_historial_revierte_estado_y_fecha(self):
        identificador = self.crear_incidencia()

        incidencias.assign_technician(
            identificador,
            {
                "id_personal_asignado": self.tecnico["id_usuario"],
            },
            self.admin,
        )
        incidencias.update_status(
            identificador,
            {"estado": "EN_PROCESO"},
            self.tecnico,
        )

        anterior = incidencias.get_incident(
            identificador,
            self.admin,
        )
        historial = incidencias.get_history(
            identificador,
            self.admin,
        )

        with patch.object(
            incidencias.activity_repo,
            "record_status",
            side_effect=RuntimeError("Fallo de historial simulado"),
        ):
            with self.assertRaises(RuntimeError):
                incidencias.update_status(
                    identificador,
                    {"estado": "RESUELTA"},
                    self.tecnico,
                )

        actual = incidencias.get_incident(
            identificador,
            self.admin,
        )

        self.assertEqual(actual["estado"], anterior["estado"])
        self.assertEqual(
            actual["fecha_resolucion"],
            anterior["fecha_resolucion"],
        )
        self.assertEqual(
            actual["updated_at"],
            anterior["updated_at"],
        )
        self.assertEqual(
            incidencias.get_history(identificador, self.admin),
            historial,
        )
        self.assertTrue(
            all(conexion.closed for conexion in self.conexiones)
        )