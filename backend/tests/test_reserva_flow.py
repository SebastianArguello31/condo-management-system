import unittest
from datetime import date, time

from marshmallow import ValidationError

from app.modules.reservations.schemas import (
    ReservaCreateSchema,
    ReservaListQuerySchema,
)
from app.modules.reservations.services import (
    build_reserva_filters,
    transicion_permitida,
)

ADMIN = {"id_usuario": 1, "rol": "ADMIN"}
RESIDENTE = {"id_usuario": 2, "rol": "RESIDENTE"}

class TestReservaCreateSchema(unittest.TestCase):
    def test_create_schema_valid(self):
        result = ReservaCreateSchema().load({
            "id_espacio": 3,
            "fecha": "2026-10-06",
            "hora_inicio": "10:00",
            "hora_fin": "12:00",
            "cantidad_personas": 10,
            "id_tipo_evento": 1,
        })

        self.assertEqual(result["fecha"], date(2026, 10, 6))
        self.assertEqual(result["hora_inicio"], time(10, 0))
        self.assertEqual(result["hora_fin"], time(12, 0))
        self.assertEqual(result["observaciones"], "")

    def test_create_schema_observaciones_opcionales(self):
        base = {
            "id_espacio": 3,
            "fecha": "2026-10-06",
            "hora_inicio": "10:00",
            "hora_fin": "12:00",
            "cantidad_personas": 10,
            "id_tipo_evento": 1,
        }

        base["observaciones"] = "Fiesta de fin de año"

        self.assertEqual(
            ReservaCreateSchema().load(base)["observaciones"],
            "Fiesta de fin de año",
        )

    def test_create_schema_invalid(self):
        schema = ReservaCreateSchema()
        valid = {
            "id_espacio": 3,
            "fecha": "2026-10-06",
            "hora_inicio": "10:00",
            "hora_fin": "12:00",
            "cantidad_personas": 10,
            "id_tipo_evento": 1,
        }

        with self.assertRaises(ValidationError):
            schema.load({k: v for k, v in valid.items() if k != "id_espacio"})

        with self.assertRaises(ValidationError):
            schema.load({**valid, "cantidad_personas": 0})

        with self.assertRaises(ValidationError):
            schema.load({**valid, "fecha": "2026-13-99"})

        with self.assertRaises(ValidationError):
            schema.load({**valid, "hora_inicio": "25:00"})

class TestReservaListQuerySchema(unittest.TestCase):
    def test_list_schema_parses_query_strings(self):
        result = ReservaListQuerySchema().load({
            "espacio": "3",
            "estado": "PENDIENTE",
            "fecha": "2026-10-06",
            "residente": "2",
        })

        self.assertEqual(result["espacio"], 3)
        self.assertEqual(result["estado"], "PENDIENTE")
        self.assertEqual(result["fecha"], date(2026, 10, 6))
        self.assertEqual(result["residente"], 2)

    def test_list_schema_sin_filtros(self):
        result = ReservaListQuerySchema().load({})

        self.assertIsNone(result["espacio"])
        self.assertIsNone(result["estado"])
        self.assertIsNone(result["fecha"])
        self.assertIsNone(result["residente"])

    def test_list_schema_invalid(self):
        schema = ReservaListQuerySchema()

        with self.assertRaises(ValidationError):
            schema.load({"espacio": "abc"})

        with self.assertRaises(ValidationError):
            schema.load({"fecha": "2026-13-01"})

        with self.assertRaises(ValidationError):
            schema.load({"residente": "0"})

class TestReservaFilters(unittest.TestCase):
    def test_admin_sin_filtros(self):
        conditions, params = build_reserva_filters(ADMIN)

        self.assertEqual(conditions, [])
        self.assertEqual(params, ())

    def test_residente_solo_sus_reservas(self):
        conditions, params = build_reserva_filters(RESIDENTE)

        self.assertEqual(conditions, ["r.id_usuario = %s"])
        self.assertEqual(params, (2,))

    def test_residente_ignora_filtro_residente(self):
        conditions, params = build_reserva_filters(RESIDENTE, residente=999)

        self.assertEqual(conditions, ["r.id_usuario = %s"])
        self.assertEqual(params, (2,))

    def test_admin_filtros_combinados(self):
        conditions, params = build_reserva_filters(
            ADMIN,
            espacio=3,
            estado="PENDIENTE",
            fecha=date(2026, 10, 6),
            residente=2,
        )

        self.assertEqual(conditions, [
            "r.id_espacio_comun = %s",
            "r.fecha = %s",
            "r.id_usuario = %s",
            "er.nombre = %s",
        ])
        self.assertEqual(params, (3, date(2026, 10, 6), 2, "PENDIENTE"))

    def test_residente_aplica_filtros_sobre_sus_reservas(self):
        conditions, params = build_reserva_filters(
            RESIDENTE,
            espacio=1,
            estado="CANCELADA",
            fecha=date(2026, 10, 7),
        )

        self.assertEqual(conditions, [
            "r.id_usuario = %s",
            "r.id_espacio_comun = %s",
            "r.fecha = %s",
            "er.nombre = %s",
        ])
        self.assertEqual(params, (2, 1, date(2026, 10, 7), "CANCELADA"))

class TestTransicionesEstado(unittest.TestCase):
    def test_pendiente_puede_aprobar(self):
        self.assertTrue(transicion_permitida("PENDIENTE", "CONFIRMADA"))

    def test_pendiente_puede_rechazar(self):
        self.assertTrue(transicion_permitida("PENDIENTE", "RECHAZADA"))

    def test_pendiente_puede_cancelar(self):
        self.assertTrue(transicion_permitida("PENDIENTE", "CANCELADA"))

    def test_confirmada_puede_cancelar(self):
        self.assertTrue(transicion_permitida("CONFIRMADA", "CANCELADA"))

    def test_confirmada_no_puede_aprobar(self):
        self.assertFalse(transicion_permitida("CONFIRMADA", "CONFIRMADA"))

    def test_cancelada_no_puede_aprobar(self):
        self.assertFalse(transicion_permitida("CANCELADA", "CONFIRMADA"))

    def test_cancelada_no_puede_rechazar(self):
        self.assertFalse(transicion_permitida("CANCELADA", "RECHAZADA"))

    def test_rechazada_no_puede_transicionar(self):
        self.assertFalse(transicion_permitida("RECHAZADA", "CANCELADA"))
        self.assertFalse(transicion_permitida("RECHAZADA", "CONFIRMADA"))

    def test_finalizada_no_puede_transicionar(self):
        self.assertFalse(transicion_permitida("FINALIZADA", "CANCELADA"))

    def test_estados_desconocidos_no_transicionan(self):
        self.assertFalse(transicion_permitida("INEXISTENTE", "CONFIRMADA"))
        self.assertFalse(transicion_permitida("PENDIENTE", "INEXISTENTE"))

if __name__ == "__main__":
    unittest.main()
