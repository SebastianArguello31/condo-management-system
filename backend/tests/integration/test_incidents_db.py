from werkzeug.exceptions import BadRequest, Forbidden

from tests.integration.support import DatabaseCase
from app.modules.incidents import services as incidencias

class TestIncidentsDatabase(DatabaseCase):
    def asignar(self, identificador, tecnico):
        return incidencias.assign_technician(
            identificador,
            {"id_personal_asignado": tecnico["id_usuario"]},
            self.admin,
        )

    def test_ciclo_completo_y_reapertura(self):
        identificador = self.crear_incidencia()
        self.asignar(identificador, self.tecnico)

        incidencias.update_status(
            identificador,
            {"estado": "EN_PROCESO"},
            self.tecnico,
        )
        incidencias.create_intervention(
            identificador,
            {"resultado": "Reparacion terminada"},
            self.tecnico,
        )
        incidencias.update_status(
            identificador,
            {"estado": "RESUELTA"},
            self.tecnico,
        )

        cierre = incidencias.update_status(
            identificador,
            {"estado": "CERRADA"},
            self.tecnico,
        )
        self.assertIsNotNone(cierre["fecha_resolucion"])

        reapertura = incidencias.update_status(
            identificador,
            {"estado": "EN_PROCESO"},
            self.admin,
        )
        self.assertIsNone(reapertura["fecha_resolucion"])

        historial = incidencias.get_history(
            identificador,
            self.admin,
        )

        self.assertEqual(
            [fila["version"] for fila in historial],
            [1, 2, 3, 4, 5, 6],
        )
        self.assertEqual(
            [fila["estado"] for fila in historial],
            [
                "RECIBIDA",
                "ASIGNADA",
                "EN_PROCESO",
                "RESUELTA",
                "CERRADA",
                "EN_PROCESO",
            ],
        )
        self.assertEqual(
            len(incidencias.list_interventions(
                identificador,
                self.admin,
            )),
            1,
        )

    def test_reasignar_retira_acceso_anterior(self):
        identificador = self.crear_incidencia()

        self.asignar(identificador, self.tecnico)
        self.asignar(identificador, self.tecnico2)

        with self.assertRaises(Forbidden):
            incidencias.get_incident(
                identificador,
                self.tecnico,
            )

        detalle = incidencias.get_incident(
            identificador,
            self.tecnico2,
        )
        self.assertEqual(
            detalle["id_personal_asignado"],
            self.tecnico2["id_usuario"],
        )

        self.assertEqual(
            self.consultar(
                """
                SELECT count(*) FROM asignaciones
                WHERE id_incidencia=%s AND activa
                """,
                (identificador,),
            )[0][0],
            1,
        )

    def test_cambios_simultaneos_no_duplican_historial(self):
        identificador = self.crear_incidencia()
        self.asignar(identificador, self.tecnico)

        def cambiar():
            try:
                incidencias.update_status(
                    identificador,
                    {"estado": "EN_PROCESO"},
                    self.tecnico,
                )
                return "actualizada"
            except BadRequest:
                return "rechazada"

        self.assertCountEqual(
            self.paralelas(cambiar, cambiar),
            ["actualizada", "rechazada"],
        )

        historial = incidencias.get_history(
            identificador,
            self.admin,
        )
        self.assertEqual(
            [fila["version"] for fila in historial],
            [1, 2, 3],
        )