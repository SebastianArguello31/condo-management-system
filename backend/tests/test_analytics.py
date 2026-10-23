import re
import unittest
from collections import defaultdict
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

from app import create_app
from app.core.security import create_access_token
from app.modules.analytics.repositories import incidents as incidents_repo
from app.modules.analytics.repositories import interventions as interventions_repo
from app.modules.analytics.repositories import inventory as inventory_repo
from app.modules.analytics.services import incidents, interventions, inventory, overview

ADMIN = {"id_usuario": 1, "rol": "ADMIN"}
TECNICO = {"id_usuario": 2, "rol": "TECNICO"}

FILTER_COMBINATIONS = [
    {},
    {"desde": date(2026, 10, 1)},
    {"hasta": date(2026, 10, 31)},
    {"desde": date(2026, 10, 1), "hasta": date(2026, 10, 31)},
    {
        "desde": date(2026, 10, 1), "hasta": date(2026, 10, 31),
        "id_edificio": 1, "id_tipo_incidencia": 2, "id_prioridad": 3, "id_tecnico": 4,
    },
]


class SqlRecorder:
    """Sustituye a query(): guarda cada sentencia y devuelve valores neutros."""

    def __init__(self):
        self.calls = []

    def __call__(self, statement, params=(), *, many=False, cursor=None):
        self.calls.append((statement, tuple(params)))
        return [] if many else defaultdict(int)


class TestAnalyticsSql(unittest.TestCase):
    """Sin PostgreSQL no se ejecuta el SQL, pero sí se valida su estructura."""

    def assert_valid_sql(self, statement, params):
        self.assertEqual(statement.count("%s"), len(params), statement)
        self.assertIsNone(re.search(r"%(?!s)", statement), "Hay un % sin escapar")
        self.assertIsNone(re.search(r"\bWHERE\s+AND\b", statement), statement)
        self.assertIsNone(re.search(r"\bAND\s+(AND|ORDER|GROUP|LIMIT|\))", statement), statement)
        self.assertEqual(statement.count("("), statement.count(")"), statement)

    def run_all(self, module, functions, scope):
        recorder = SqlRecorder()
        with patch.object(module, "query", recorder):
            for filters in FILTER_COMBINATIONS:
                for function in functions:
                    function(dict(filters), scope)
        self.assertTrue(recorder.calls)
        for statement, params in recorder.calls:
            self.assert_valid_sql(statement, params)

    def test_consultas_de_incidencias(self):
        functions = [
            lambda f, s: incidents_repo.get_incident_kpis(f, s, cursor=None),
            lambda f, s: incidents_repo.get_incidents_by_status(f, s, cursor=None),
            lambda f, s: incidents_repo.get_incidents_by_priority(f, s, cursor=None),
            lambda f, s: incidents_repo.get_incidents_by_type(f, s, cursor=None),
            lambda f, s: incidents_repo.get_incidents_timeline(f, s, cursor=None),
            lambda f, s: incidents_repo.get_resolution_times_by_priority(f, s, cursor=None),
            lambda f, s: incidents_repo.list_incidents(f, s, cursor=None),
            lambda f, s: incidents_repo.list_incidents(
                f, s, statuses=incidents_repo.PENDING_STATUSES, status="ASIGNADA", cursor=None,
            ),
        ]
        for scope in (None, 2):
            self.run_all(incidents_repo, functions, scope)

    def test_consultas_de_intervenciones(self):
        functions = [
            lambda f, s: interventions_repo.get_intervention_kpis(f, s, cursor=None),
            lambda f, s: interventions_repo.get_interventions_by_technician(f, s, cursor=None),
            lambda f, s: interventions_repo.list_pending_interventions(f, s, cursor=None),
            lambda f, s: interventions_repo.list_interventions(f, s, cursor=None),
        ]
        for scope in (None, 2):
            self.run_all(interventions_repo, functions, scope)

    def test_consultas_de_inventario(self):
        functions = [
            lambda f, s: inventory_repo.get_consumption_totals(f, s, cursor=None),
            lambda f, s: inventory_repo.get_top_consumed_items(f, s, cursor=None),
            lambda f, s: inventory_repo.get_consumption_timeline(f, s, cursor=None),
            lambda f, s: inventory_repo.list_low_stock(cursor=None),
            lambda f, s: inventory_repo.count_low_stock(cursor=None),
        ]
        for scope in (None, 2):
            self.run_all(inventory_repo, functions, scope)

    def test_tecnico_no_amplia_alcance_con_id_tecnico_ajeno(self):
        for builder in (
            incidents_repo.build_incident_filters,
            interventions_repo.build_intervention_filters,
            inventory_repo.build_consumption_filters,
        ):
            with self.subTest(builder=builder.__name__):
                where, params = builder({"id_tecnico": 99}, 2)
                self.assertIn(99, params)
                self.assertIn(2, params)
                self.assertNotIn(" OR ", where)

    def test_edificio_incluye_espacios_comunes(self):
        where, _ = incidents_repo.build_incident_filters({"id_edificio": 1})
        self.assertIn("COALESCE(u.id_edificio, ec.id_edificio)", where)

    def test_hasta_incluye_el_dia_completo(self):
        where, params = incidents_repo.build_incident_filters({"hasta": date(2026, 10, 31)})
        self.assertIn("< %s::date + 1", where)
        self.assertEqual(params, [date(2026, 10, 31)])

    def test_consumo_descuenta_devoluciones(self):
        where, _ = inventory_repo.build_consumption_filters({})
        self.assertIn("'DEVOLUCION'", where)
        self.assertIn("-m.cantidad", inventory_repo.SIGNED_QUANTITY)


class TestAnalyticsServices(unittest.TestCase):
    def setUp(self):
        self.cursor = MagicMock()

    def incident_kpis(self, **overrides):
        return {
            "total_incidencias": 20, "incidencias_pendientes": 5, "incidencias_resueltas": 15,
            "incidencias_descartadas": 0, "tiempo_promedio_resolucion_horas": Decimal("14.5"),
            "resueltas_en_plazo": 12, "total_con_plazo": 15, **overrides,
        }

    def patch_incident_repo(self, kpis):
        stack = [
            patch.object(incidents.repo, "get_incident_kpis", return_value=kpis),
            patch.object(incidents.repo, "get_incidents_by_status", return_value=[{"estado": "RESUELTA", "total": 15}]),
            patch.object(incidents.repo, "get_incidents_by_priority", return_value=[{"prioridad": "Alta", "total": 10}]),
            patch.object(incidents.repo, "get_incidents_by_type", return_value=[]),
            patch.object(incidents.repo, "get_incidents_timeline", return_value=[]),
            patch.object(incidents.repo, "get_resolution_times_by_priority",
                         return_value=[{"prioridad": "Alta", "horas_promedio": Decimal("3.5")}]),
        ]
        for item in stack:
            item.start()
            self.addCleanup(item.stop)

    def test_tasas_y_porcentajes(self):
        self.patch_incident_repo(self.incident_kpis())
        data = incidents.compute({}, ADMIN, cursor=self.cursor)
        self.assertEqual(data["resumen"]["tasa_resolucion_porcentaje"], 75.0)
        self.assertEqual(data["resumen"]["tasa_cumplimiento_sla_porcentaje"], 80.0)
        self.assertEqual(data["resumen"]["tiempo_promedio_resolucion_horas"], 14.5)
        self.assertEqual(data["por_estado"][0]["porcentaje"], 75.0)
        self.assertEqual(data["por_prioridad"][0]["porcentaje"], 50.0)
        self.assertIsInstance(data["tiempos_por_prioridad"][0]["horas_promedio"], float)

    def test_sin_datos_no_inventa_ceros(self):
        self.patch_incident_repo(self.incident_kpis(
            total_incidencias=0, incidencias_pendientes=0, incidencias_resueltas=0,
            tiempo_promedio_resolucion_horas=None, resueltas_en_plazo=0, total_con_plazo=0,
        ))
        data = incidents.compute({}, ADMIN, cursor=self.cursor)
        self.assertEqual(data["resumen"]["tasa_resolucion_porcentaje"], 0.0)
        self.assertIsNone(data["resumen"]["tiempo_promedio_resolucion_horas"])
        self.assertIsNone(data["resumen"]["tasa_cumplimiento_sla_porcentaje"])

    def test_tecnico_se_acota_a_si_mismo(self):
        with patch.object(incidents.repo, "get_incident_kpis", return_value=self.incident_kpis()) as kpis, \
             patch.object(incidents.repo, "get_incidents_by_status", return_value=[]), \
             patch.object(incidents.repo, "get_incidents_by_priority", return_value=[]), \
             patch.object(incidents.repo, "get_incidents_by_type", return_value=[]), \
             patch.object(incidents.repo, "get_incidents_timeline", return_value=[]), \
             patch.object(incidents.repo, "get_resolution_times_by_priority", return_value=[]):
            incidents.compute({}, TECNICO, cursor=self.cursor)
        self.assertEqual(kpis.call_args.args[1], TECNICO["id_usuario"])

    def test_intervenciones_por_tecnico(self):
        with patch.object(interventions.repo, "get_intervention_kpis",
                          return_value={"total_intervenciones": 10, "pendientes_intervencion": 3}), \
             patch.object(interventions.repo, "get_interventions_by_technician", return_value=[
                 {"id_tecnico": 2, "total_intervenciones": 7},
                 {"id_tecnico": 3, "total_intervenciones": 3},
             ]):
            data = interventions.compute({}, ADMIN, cursor=self.cursor)
        self.assertEqual([r["porcentaje"] for r in data["por_tecnico"]], [70.0, 30.0])

    def test_inventario_acota_consumos_del_tecnico(self):
        with patch.object(inventory.repo, "get_consumption_totals", return_value={
                 "costo_total_consumido": Decimal("125000.504"), "total_unidades_consumidas": Decimal("35.000"),
             }) as totals, \
             patch.object(inventory.repo, "count_low_stock", return_value=4), \
             patch.object(inventory.repo, "get_top_consumed_items", return_value=[]), \
             patch.object(inventory.repo, "list_low_stock", return_value=[]), \
             patch.object(inventory.repo, "get_consumption_timeline", return_value=[]):
            data = inventory.compute({}, TECNICO, cursor=self.cursor)
        self.assertEqual(totals.call_args.args[1], TECNICO["id_usuario"])
        self.assertEqual(data["resumen"]["insumos_bajo_stock"], 4)
        self.assertEqual(data["resumen"]["costo_total_consumido"], 125000.5)

    def test_filtros_no_exponen_tecnicos_a_otro_tecnico(self):
        with patch.object(overview, "transaction"), \
             patch.object(overview.catalogs, "list_buildings", return_value=[]), \
             patch.object(overview.catalogs, "list_types", return_value=[]), \
             patch.object(overview.catalogs, "list_priorities", return_value=[]), \
             patch.object(overview.catalogs, "list_technicians", return_value=[{"id_usuario": 9}]) as techs:
            self.assertEqual(overview.get_filter_options(TECNICO)["tecnicos"], [])
            techs.assert_not_called()
            self.assertEqual(overview.get_filter_options(ADMIN)["tecnicos"], [{"id_usuario": 9}])


class TestAnalyticsHttpRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "JWT_SECRET_KEY": "clave-pruebas-analytics-de-32-bytes!",
            "JWT_ACCESS_TOKEN_HOURS": 1,
        })
        self.client = self.app.test_client()
        bloqueo = patch(
            "app.core.db_helpers.get_connection",
            side_effect=AssertionError("Acceso inesperado a PostgreSQL"),
        )
        bloqueo.start()
        self.addCleanup(bloqueo.stop)

    def login_as(self, user):
        parche = patch("app.core.decorators.get_user", return_value={**user, "activo": True})
        parche.start()
        self.addCleanup(parche.stop)
        with self.app.app_context():
            token = create_access_token(user["id_usuario"])
        return {"Authorization": f"Bearer {token}"}

    def test_rutas_exigen_token(self):
        for path in ("dashboard", "incidencias", "intervenciones", "inventario", "registros", "filtros"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/condominio/analytics/{path}").status_code, 401)

    def test_residente_no_accede(self):
        headers = self.login_as({"id_usuario": 10, "rol": "RESIDENTE"})
        for path in ("dashboard", "registros?tipo_registro=incidencias", "filtros"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/condominio/analytics/{path}", headers=headers).status_code, 403)

    def test_admin_obtiene_dashboard_y_parametros_vacios_se_ignoran(self):
        headers = self.login_as(ADMIN)
        with patch.object(overview, "get_dashboard_overview", return_value={"kpis": {}}) as servicio:
            response = self.client.get("/condominio/analytics/dashboard?id_edificio=&desde=2026-10-01", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(servicio.call_args.args[0], {"desde": date(2026, 10, 1)})

    def test_validaciones_de_parametros(self):
        headers = self.login_as(ADMIN)
        for path in (
            "dashboard?desde=fecha-invalida",
            "dashboard?desde=2026-10-31&hasta=2026-10-01",
            "dashboard?id_edificio=0",
            "registros",
            "registros?tipo_registro=desconocido",
            "registros?tipo_registro=incidencias&limit=1000",
            "registros?tipo_registro=incidencias&estado=INVENTADO",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/condominio/analytics/{path}", headers=headers).status_code, 400)

    def test_drilldown_envia_estado_y_limite(self):
        headers = self.login_as(TECNICO)
        with patch.object(overview, "get_records", return_value=[]) as servicio:
            response = self.client.get(
                "/condominio/analytics/registros?tipo_registro=incidencias&estado=ASIGNADA&limit=20&id_prioridad=2",
                headers=headers,
            )
        self.assertEqual(response.status_code, 200)
        args, kwargs = servicio.call_args
        self.assertEqual(args[0], "incidencias")
        self.assertEqual(args[1], {"id_prioridad": 2})
        self.assertEqual(kwargs, {"status": "ASIGNADA", "limit": 20})
