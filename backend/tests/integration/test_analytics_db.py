from app.modules.analytics.services import incidents as analytics_incidents
from app.modules.analytics.services import overview
from app.modules.incidents import services as incidencias
from app.modules.maintenance.services import interventions as consumos
from app.modules.maintenance.services import inventory as inventario
from tests.integration.support import DatabaseCase


class TestAnalyticsDatabase(DatabaseCase):
    """Ejecuta el SQL real del dashboard sobre un flujo completo y controlado."""

    def setUp(self):
        super().setUp()
        hoy = self.consultar("SELECT CURRENT_DATE")[0][0]
        self.periodo = {"desde": hoy, "hasta": hoy}

        # Incidencia 1: atendida por self.tecnico, con consumo y devolución.
        self.resuelta = self.crear_incidencia()
        self.asignar(self.resuelta, self.tecnico)
        incidencias.update_status(self.resuelta, {"estado": "EN_PROCESO"}, self.tecnico)
        intervencion = incidencias.create_intervention(
            self.resuelta, {"resultado": "Cambio de cañería"}, self.tecnico,
        )

        self.insumo = inventario.create_item({
            "nombre": "Cinta de prueba analytics", "categoria": "PLOMERIA",
            "unidad_medida": "ROLLO", "stock_minimo": "8.000", "costo_unitario": "2500.00",
        })["id_insumo"]
        inventario.register_movement(
            self.insumo, "INICIAL", {"cantidad": "10", "motivo": "Stock inicial"},
            self.admin["id_usuario"],
        )
        consumos.consume(
            intervencion["id_intervencion"],
            {"id_insumo": self.insumo, "cantidad": "4", "motivo": "Reparación"}, self.tecnico,
        )
        consumos.return_consumption(
            intervencion["id_intervencion"],
            {"id_insumo": self.insumo, "cantidad": "1", "motivo": "Sobrante"}, self.tecnico,
        )
        incidencias.update_status(self.resuelta, {"estado": "RESUELTA"}, self.tecnico)

        # Incidencia 2: asignada a self.tecnico2, todavía sin intervención.
        self.pendiente = self.crear_incidencia()
        self.asignar(self.pendiente, self.tecnico2)

    def asignar(self, identificador, tecnico):
        incidencias.assign_technician(
            identificador, {"id_personal_asignado": tecnico["id_usuario"]}, self.admin,
        )

    def test_indicadores_del_tecnico_coinciden_con_el_flujo(self):
        datos = overview.get_dashboard_overview(dict(self.periodo), self.tecnico)
        kpis = datos["kpis"]

        self.assertEqual(kpis["total_incidencias"], 1)
        self.assertEqual(kpis["incidencias_resueltas"], 1)
        self.assertEqual(kpis["incidencias_pendientes"], 0)
        self.assertEqual(kpis["tasa_resolucion_porcentaje"], 100.0)
        self.assertIsNotNone(kpis["tiempo_promedio_resolucion_horas"])
        self.assertEqual(kpis["total_intervenciones"], 1)
        self.assertEqual(kpis["pendientes_intervencion"], 0)
        # Consumo neto: 4 consumidos - 1 devuelto = 3 x 2500.
        self.assertEqual(kpis["costo_insumos_consumidos"], 7500.0)

        top = datos["inventario"]["top_insumos"]
        self.assertEqual([(t["id_insumo"], t["total_consumido"]) for t in top], [(self.insumo, 3.0)])

        dia = datos["incidencias"]["evolucion_temporal"]
        self.assertEqual([(d["reportadas"], d["resueltas"]) for d in dia], [(1, 1)])

    def test_tecnico_no_ve_datos_ajenos_aunque_filtre_por_otro(self):
        ajenos = analytics_incidents.get_incident_metrics(
            {**self.periodo, "id_tecnico": self.tecnico2["id_usuario"]}, self.tecnico,
        )
        self.assertEqual(ajenos["resumen"]["total_incidencias"], 0)

    def test_drilldown_devuelve_los_registros_que_componen_el_indicador(self):
        pendientes = overview.get_records(
            "pendientes_intervencion", dict(self.periodo), self.admin,
        )
        self.assertIn(self.pendiente, [r["id_incidencia"] for r in pendientes])
        self.assertNotIn(self.resuelta, [r["id_incidencia"] for r in pendientes])

        resueltas = overview.get_records(
            "incidencias_resueltas", {**self.periodo, "id_tecnico": self.tecnico["id_usuario"]}, self.admin,
        )
        self.assertEqual([r["id_incidencia"] for r in resueltas], [self.resuelta])

        por_estado = overview.get_records(
            "incidencias", dict(self.periodo), self.admin, status="ASIGNADA",
        )
        self.assertIn(self.pendiente, [r["id_incidencia"] for r in por_estado])

        bajo_stock = overview.get_records("insumos_bajo_stock", {}, self.admin)
        fila = next(r for r in bajo_stock if r["id_insumo"] == self.insumo)
        self.assertEqual((fila["stock"], fila["faltante"]), (7.0, 1.0))
